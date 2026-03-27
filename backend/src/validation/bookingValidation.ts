import { db } from "../db";
import { bookings, rooms } from "../db/schema";
import { eq, and, lt, gt, ne, sql } from "drizzle-orm";
import type { BookingPayload, ValidationResult } from "./types";

// ── 1. Room overlap — checks confirmed bookings table ONLY ──
export async function validateRoomAvailability(
    payload: BookingPayload,
    excludeBookingId?: number
): Promise<ValidationResult> {
    const conditions = [
        eq(bookings.roomId, payload.roomId),
        lt(bookings.startAt, payload.endAt),
        gt(bookings.endAt, payload.startAt),
    ];

    if (excludeBookingId !== undefined) {
        conditions.push(ne(bookings.id, excludeBookingId));
    }

    const overlap = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(...conditions))
        .limit(1);

    if (overlap.length > 0) {
        return {
            valid: false,
            error: {
                type: "ROOM_CONFLICT",
                message: "Room is already booked for this time range",
            },
        };
    }

    return { valid: true };
}

// ── 2. Audience conflict — checks confirmed bookings table ONLY ──
// Only runs when courseId is not null
export async function validateAudienceConflict(
    payload: BookingPayload,
    excludeBookingId?: number
): Promise<ValidationResult> {
    if (!payload.courseId) {
        return { valid: true };
    }

    const conditions = [
        eq(bookings.courseId!, payload.courseId),
        lt(bookings.startAt, payload.endAt),
        gt(bookings.endAt, payload.startAt),
    ];

    if (excludeBookingId !== undefined) {
        conditions.push(ne(bookings.id, excludeBookingId));
    }

    const conflict = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(...conditions))
        .limit(1);

    if (conflict.length > 0) {
        return {
            valid: false,
            error: {
                type: "COURSE_CONFLICT",
                message:
                    "Students of this course already have another scheduled event at this time",
            },
        };
    }

    return { valid: true };
}

// ── 3. Capacity check ──
export async function validateCapacity(
    roomId: number,
    studentCount: number
): Promise<ValidationResult> {
    const roomRows = await db
        .select({ capacity: rooms.capacity })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1);

    const room = roomRows[0];
    if (!room) {
        return { valid: true }; // room existence is checked elsewhere
    }

    if (room.capacity !== null && room.capacity < studentCount) {
        return {
            valid: false,
            error: {
                type: "CAPACITY_ERROR",
                message: `Room capacity (${room.capacity}) is less than requested student count (${studentCount})`,
            },
        };
    }

    return { valid: true };
}

// ── 4. Equipment check ──
export async function validateEquipment(
    roomId: number,
    requiredEquipment: string[]
): Promise<ValidationResult> {
    const roomRows = await db
        .select({ equipment: rooms.equipment })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1);

    const room = roomRows[0];
    if (!room) {
        return { valid: true }; // room existence is checked elsewhere
    }

    const roomEquipment = room.equipment ?? [];
    const missing = requiredEquipment.filter(
        (item) => !roomEquipment.includes(item)
    );

    if (missing.length > 0) {
        return {
            valid: false,
            error: {
                type: "EQUIPMENT_ERROR",
                message: `Room is missing required equipment: ${missing.join(", ")}`,
            },
        };
    }

    return { valid: true };
}

// ── 5. Master validator — runs all checks in strict order ──
// Services call ONLY this function, never individual validators.
export async function runBookingValidation(
    payload: BookingPayload,
    options?: {
        excludeBookingId?: number;
        skipAudienceCheck?: boolean;
    }
): Promise<ValidationResult> {
    // 1. Room conflict
    const roomResult = await validateRoomAvailability(
        payload,
        options?.excludeBookingId
    );
    if (!roomResult.valid) return roomResult;

    // 2. Audience conflict (if courseId present)
    if (payload.courseId && !options?.skipAudienceCheck) {
        const audienceResult = await validateAudienceConflict(
            payload,
            options?.excludeBookingId
        );
        if (!audienceResult.valid) return audienceResult;
    }

    // 3. Capacity (if studentCount present)
    if (payload.studentCount) {
        const capacityResult = await validateCapacity(
            payload.roomId,
            payload.studentCount
        );
        if (!capacityResult.valid) return capacityResult;
    }

    // 4. Equipment (if requiredEquipment present)
    if (payload.requiredEquipment && payload.requiredEquipment.length > 0) {
        const equipResult = await validateEquipment(
            payload.roomId,
            payload.requiredEquipment
        );
        if (!equipResult.valid) return equipResult;
    }

    return { valid: true };
}
