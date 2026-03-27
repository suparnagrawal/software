import { runBookingValidation } from "../../validation/bookingValidation";
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from "../../lib/errors";
import * as queries from "./booking.queries";
import { getRoomSuggestions } from "../availability/suggestions.service";

export async function createDirectBooking(
    actingUser: { id: number; role: string },
    payload: {
        roomId: number;
        startAt: string | Date;
        endAt: string | Date;
        courseId?: number | null;
        studentCount?: number | null;
        requiredEquipment?: string[] | null;
    }
) {
    const { roomId, courseId } = payload;

    // Parse datetimes
    const startAt =
        payload.startAt instanceof Date
            ? payload.startAt
            : new Date(payload.startAt);
    const endAt =
        payload.endAt instanceof Date ? payload.endAt : new Date(payload.endAt);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
        throw new ValidationError("Invalid datetime format");
    }
    if (startAt >= endAt) {
        throw new ValidationError("startAt must be before endAt");
    }

    // Room existence
    const exists = await queries.roomExists(roomId);
    if (!exists) throw new NotFoundError("Room");

    // Centralized validation
    const validationResult = await runBookingValidation({
        roomId,
        startAt,
        endAt,
        courseId: courseId ?? null,
        studentCount: payload.studentCount ?? null,
        requiredEquipment: payload.requiredEquipment ?? null,
    });

    if (!validationResult.valid && validationResult.error) {
        const err = validationResult.error;
        // Optionally fetch suggestions for non-course conflicts
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

    // Insert (DB exclusion constraint is the final safety net)
    try {
        return await queries.insertBooking({
            roomId,
            startAt,
            endAt,
            requestId: null,
            courseId: courseId ?? null,
        });
    } catch (error: any) {
        const pgCode = error?.code || error?.cause?.code;
        if (pgCode === "23P01") {
            throw new ConflictError(
                "ROOM_CONFLICT",
                "Room already booked for this time range"
            );
        }
        throw error;
    }
}

export async function listBookings(filters: {
    startAt?: string | undefined;
    endAt?: string | undefined;
    roomId?: string | undefined;
    buildingId?: string | undefined;
}) {
    const parsedStartAt = filters.startAt ? new Date(filters.startAt) : undefined;
    const parsedEndAt = filters.endAt ? new Date(filters.endAt) : undefined;
    const parsedRoomId = filters.roomId ? Number(filters.roomId) : undefined;
    const parsedBuildingId = filters.buildingId
        ? Number(filters.buildingId)
        : undefined;

    // Validations
    if (
        (parsedStartAt && !parsedEndAt) ||
        (!parsedStartAt && parsedEndAt)
    ) {
        throw new ValidationError(
            "Both startAt and endAt must be provided together"
        );
    }

    if (parsedStartAt && parsedEndAt) {
        if (isNaN(parsedStartAt.getTime()) || isNaN(parsedEndAt.getTime())) {
            throw new ValidationError("Invalid date format");
        }
        if (parsedStartAt >= parsedEndAt) {
            throw new ValidationError("startAt must be less than endAt");
        }
    }

    if (parsedRoomId !== undefined && isNaN(parsedRoomId)) {
        throw new ValidationError("Invalid roomId");
    }

    if (parsedBuildingId !== undefined && isNaN(parsedBuildingId)) {
        throw new ValidationError("Invalid buildingId");
    }

    return queries.getBookings({
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        roomId: parsedRoomId,
        buildingId: parsedBuildingId,
    });
}

export async function getBooking(id: number) {
    const booking = await queries.getBookingById(id);
    if (!booking) throw new NotFoundError("Booking");
    return booking;
}

export async function deleteBooking(id: number) {
    const result = await queries.deleteBookingById(id);
    if (!result) throw new NotFoundError("Booking");
    return result;
}
