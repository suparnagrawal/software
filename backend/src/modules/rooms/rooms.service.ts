import * as queries from "./rooms.queries";
import { NotFoundError, ValidationError, ForbiddenError } from "../../lib/errors";
import { db } from "../../db";
import { staffBuildings } from "../../db/schema";
import { and, eq } from "drizzle-orm";

export async function listRooms(buildingId?: number | undefined) {
    if (buildingId !== undefined) {
        const exists = await queries.buildingExists(buildingId);
        if (!exists) throw new NotFoundError("Building");
        return queries.getRoomsByBuildingId(buildingId);
    }
    return queries.getAllRooms();
}

export async function getRoom(id: number) {
    const room = await queries.getRoomById(id);
    if (!room) throw new NotFoundError("Room");
    return room;
}

export async function createRoom(data: {
    name: string;
    buildingId: number;
    capacity?: number | undefined;
    equipment?: string[] | undefined;
}) {
    if (!data.name) throw new ValidationError("Name is required");
    if (data.buildingId === undefined) throw new ValidationError("buildingId is required");
    return queries.insertRoom(data);
}

export async function updateRoom(
    id: number,
    data: { name?: string | undefined; capacity?: number | undefined; equipment?: string[] | undefined }
) {
    if (data.name !== undefined && !data.name.trim()) {
        throw new ValidationError("Name cannot be empty");
    }
    const result = await queries.updateRoom(id, data);
    if (!result) throw new NotFoundError("Room");
    return result;
}

export async function deleteRoom(id: number) {
    const result = await queries.deleteRoom(id);
    if (!result) throw new NotFoundError("Room");
    return result;
}

export async function getRoomAvailability(
    roomId: number,
    startAt: Date,
    endAt: Date
) {
    const room = await queries.getRoomById(roomId);
    if (!room) throw new NotFoundError("Room");

    const overlappingBookings = await queries.getOverlappingBookings(roomId, startAt, endAt);
    const unavailability = await queries.getOverlappingUnavailability(roomId, startAt, endAt);

    return { bookings: overlappingBookings, unavailability };
}

// ── Room Unavailability CRUD ──

async function isStaffForRoom(userId: number, roomId: number): Promise<boolean> {
    const room = await queries.getRoomById(roomId);
    if (!room) return false;
    const rows = await db
        .select()
        .from(staffBuildings)
        .where(
            and(
                eq(staffBuildings.userId, userId),
                eq(staffBuildings.buildingId, room.buildingId)
            )
        )
        .limit(1);
    return rows.length > 0;
}

export async function createUnavailability(
    actingUser: { id: number; role: string },
    roomId: number,
    data: { startAt: Date; endAt: Date; reason: string }
) {
    const room = await queries.getRoomById(roomId);
    if (!room) throw new NotFoundError("Room");

    if (actingUser.role === "STAFF") {
        const isStaff = await isStaffForRoom(actingUser.id, roomId);
        if (!isStaff) throw new ForbiddenError("You are not assigned to this room's building");
    }

    return queries.insertUnavailability({
        roomId,
        startAt: data.startAt,
        endAt: data.endAt,
        reason: data.reason,
    });
}

export async function removeUnavailability(
    actingUser: { id: number; role: string },
    unavailabilityId: number
) {
    const record = await queries.getUnavailabilityById(unavailabilityId);
    if (!record) throw new NotFoundError("Unavailability record");

    if (actingUser.role === "STAFF") {
        const isStaff = await isStaffForRoom(actingUser.id, record.roomId);
        if (!isStaff) throw new ForbiddenError("You are not assigned to this room's building");
    }

    return queries.deleteUnavailability(unavailabilityId);
}

export async function listUnavailability(roomId: number) {
    const room = await queries.getRoomById(roomId);
    if (!room) throw new NotFoundError("Room");
    return queries.getUnavailabilityForRoom(roomId);
}
