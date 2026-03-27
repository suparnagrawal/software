import { db } from "../../db";
import { bookings, bookingRequests } from "../../db/schema";
import { eq } from "drizzle-orm";
import { runBookingValidation } from "../../validation/bookingValidation";
import {
    ConflictError,
    NotFoundError,
    ValidationError,
    ForbiddenError,
} from "../../lib/errors";
import * as queries from "./bookingRequest.queries";
import { triggerNotification } from "../notifications/notifications.service";
import { getRoomSuggestions } from "../availability/suggestions.service";

const ALL_STATUSES = [
    "PENDING_FACULTY",
    "PENDING_STAFF",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
] as const;

type BookingRequestStatus = (typeof ALL_STATUSES)[number];

function isValidStatus(value: unknown): value is BookingRequestStatus {
    return (
        typeof value === "string" &&
        (ALL_STATUSES as readonly string[]).includes(value)
    );
}

// ── Create Booking Request ──
export async function createBookingRequest(
    actingUser: { id: number; role: string },
    payload: {
        roomId: number;
        startAt: string;
        endAt: string;
        purpose: string;
        courseId?: number | null;
        studentCount?: number | null;
        requiredEquipment?: string[] | null;
        type?: "NEW_BOOKING" | "SLOT_CHANGE" | "ROOM_CHANGE";
        originalBookingId?: number | null;
    }
) {
    const roomId = Number(payload.roomId);
    if (isNaN(roomId)) throw new ValidationError("Invalid roomId");

    if (!payload.startAt || !payload.endAt)
        throw new ValidationError("startAt and endAt are required");

    const purpose = payload.purpose?.trim();
    if (!purpose) throw new ValidationError("Purpose is required");

    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()))
        throw new ValidationError("Invalid datetime format");

    if (startAt >= endAt)
        throw new ValidationError("startAt must be before endAt");

    // 1. Centralized validation (room conflict → audience → capacity → equipment)
    const validationResult = await runBookingValidation({
        roomId,
        startAt,
        endAt,
        courseId: payload.courseId ?? null,
        studentCount: payload.studentCount ?? null,
        requiredEquipment: payload.requiredEquipment ?? null,
    }, payload.originalBookingId ? { excludeBookingId: payload.originalBookingId } : undefined);

    if (!validationResult.valid && validationResult.error) {
        const err = validationResult.error;
        let suggestions: any[] | undefined;
        if (err.type !== "COURSE_CONFLICT") {
            try {
                suggestions = await getRoomSuggestions({
                    startAt,
                    endAt,
                    capacity: payload.studentCount ?? undefined,
                    equipment: payload.requiredEquipment ?? undefined,
                });
            } catch {
                // suggestion failure should not block error response
            }
        }
        throw new ConflictError(err.type, err.message, suggestions);
    }

    // 2. Duplicate pending check (workflow rule, not validation)
    const hasDuplicate = await queries.checkDuplicatePending(
        actingUser.id,
        roomId,
        startAt,
        endAt
    );
    if (hasDuplicate) {
        throw new ConflictError(
            "DUPLICATE_PENDING",
            "A pending request already exists for this time range"
        );
    }

    // 3. Set initial status
    const status: "PENDING_FACULTY" | "PENDING_STAFF" =
        actingUser.role === "STUDENT" ? "PENDING_FACULTY" : "PENDING_STAFF";

    // 4. Insert
    const request = await queries.insertRequest({
        userId: actingUser.id,
        roomId,
        startAt,
        endAt,
        purpose,
        status,
        courseId: payload.courseId ?? null,
        studentCount: payload.studentCount ?? null,
        requiredEquipment: payload.requiredEquipment ?? null,
        type: payload.type ?? "NEW_BOOKING",
        originalBookingId: payload.originalBookingId ?? null,
    });

    // 5. Notification
    try {
        await triggerNotification("REQUEST_CREATED", request);
    } catch {
        // notification failure should not break request creation
    }

    return request;
}

// ── Forward ──
export async function forwardRequest(
    requestId: number,
    actingUser: { id: number; role: string }
) {
    const request = await queries.getRequestById(requestId);
    if (!request) throw new NotFoundError("Request");

    if (request.status !== "PENDING_FACULTY") {
        throw new ValidationError(
            "Only PENDING_FACULTY requests can be forwarded"
        );
    }

    const updated = await queries.updateRequestStatus(requestId, "PENDING_STAFF");

    try {
        await triggerNotification("REQUEST_FORWARDED", updated!);
    } catch { /* non-critical */ }

    return updated;
}

// ── Reject ──
export async function rejectRequest(
    requestId: number,
    actingUser: { id: number; role: string }
) {
    const request = await queries.getRequestById(requestId);
    if (!request) throw new NotFoundError("Request");

    const role = actingUser.role;
    if (
        (role === "FACULTY" && request.status !== "PENDING_FACULTY") ||
        (role === "STAFF" && request.status !== "PENDING_STAFF")
    ) {
        throw new ValidationError("Invalid status for rejection");
    }

    const updated = await queries.updateRequestStatus(requestId, "REJECTED");

    try {
        await triggerNotification("REQUEST_REJECTED", updated!);
    } catch { /* non-critical */ }

    return updated;
}

// ── Approve (CRITICAL — runs in DB transaction) ──
export async function approveRequest(
    requestId: number,
    actingUser: { id: number; role: string }
) {
    const result = await db.transaction(async (tx) => {
        // 1. Fetch request inside transaction
        const rows = await tx
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.id, requestId));

        const request = rows[0];
        if (!request) throw new NotFoundError("Request");

        // 2. Verify status + permissions
        if (request.status !== "PENDING_STAFF") {
            throw new ValidationError("Request is not pending staff approval");
        }

        // 3. Revalidate (room + audience conflict)
        const validationResult = await runBookingValidation({
            roomId: request.roomId,
            startAt: request.startAt,
            endAt: request.endAt,
            courseId: request.courseId ?? null,
            studentCount: request.studentCount ?? null,
            requiredEquipment: request.requiredEquipment ?? null,
        }, request.originalBookingId ? { excludeBookingId: request.originalBookingId } : undefined);

        if (!validationResult.valid && validationResult.error) {
            throw new ConflictError(
                validationResult.error.type,
                validationResult.error.message
            );
        }

        // 4. Insert or Update booking using tx
        let inserted;
        if (request.type === "SLOT_CHANGE" || request.type === "ROOM_CHANGE") {
            if (!request.originalBookingId) throw new Error("Missing original booking ID for change request");
            const updated = await tx
                .update(bookings)
                .set({
                    roomId: request.roomId,
                    startAt: request.startAt,
                    endAt: request.endAt,
                })
                .where(eq(bookings.id, request.originalBookingId))
                .returning();
            inserted = updated;
        } else {
            inserted = await tx
                .insert(bookings)
                .values({
                    roomId: request.roomId,
                    startAt: request.startAt,
                    endAt: request.endAt,
                    requestId: request.id,
                    courseId: request.courseId ?? null,
                })
                .returning();
        }

        // 5. Update request status using tx
        await tx
            .update(bookingRequests)
            .set({ status: "APPROVED" })
            .where(eq(bookingRequests.id, requestId));

        return inserted[0];
    });

    // Notification (after transaction commits)
    try {
        await triggerNotification("REQUEST_APPROVED", { id: requestId } as any);
    } catch { /* non-critical */ }

    return result;
}

// ── Cancel ──
export async function cancelRequest(
    requestId: number,
    actingUser: { id: number; role: string }
) {
    const request = await queries.getRequestById(requestId);
    if (!request) throw new NotFoundError("Request");

    // Permission check
    if (actingUser.role !== "ADMIN" && request.userId !== actingUser.id) {
        throw new ForbiddenError();
    }

    // Status check
    if (
        request.status !== "PENDING_FACULTY" &&
        request.status !== "PENDING_STAFF"
    ) {
        throw new ValidationError("Only pending requests can be cancelled");
    }

    const updated = await queries.updateRequestStatus(requestId, "CANCELLED");

    try {
        await triggerNotification("REQUEST_CANCELLED", updated!);
    } catch { /* non-critical */ }

    return updated;
}

// ── List ──
export async function listRequests(
    actingUser: { id: number; role: string },
    filters: { status?: string | undefined }
) {
    if (
        filters.status !== undefined &&
        !isValidStatus(filters.status)
    ) {
        throw new ValidationError("Invalid status");
    }

    let staffBuildingIds: number[] | undefined;
    if (actingUser.role === "STAFF") {
        staffBuildingIds = await queries.getStaffBuildingIds(actingUser.id);
    }

    return queries.getRequestsForRole(actingUser, filters, staffBuildingIds);
}

// ── Get Single ──
export async function getRequest(
    requestId: number,
    actingUser: { id: number; role: string }
) {
    const request = await queries.getRequestById(requestId);
    if (!request) throw new NotFoundError("Request");

    // Visibility check
    const role = actingUser.role;
    const userId = actingUser.id;

    if (role === "ADMIN") return request;
    if (role === "STUDENT" && request.userId === userId) return request;
    if (
        role === "FACULTY" &&
        (request.userId === userId || request.status === "PENDING_FACULTY")
    )
        return request;
    if (role === "STAFF" && request.status === "PENDING_STAFF") return request;

    throw new ForbiddenError();
}
