import { db } from "../../db";
import { rooms, buildings, bookings, roomUnavailability } from "../../db/schema";
import { eq, and, lt, gt, asc } from "drizzle-orm";

export async function getAllRooms() {
    return db.select().from(rooms);
}

export async function getRoomsByBuildingId(buildingId: number) {
    return db.select().from(rooms).where(eq(rooms.buildingId, buildingId));
}

export async function getRoomById(id: number) {
    const rows = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return rows[0] ?? null;
}

export async function insertRoom(data: {
    name: string;
    buildingId: number;
    capacity?: number | undefined;
    equipment?: string[] | undefined;
}) {
    const result = await db
        .insert(rooms)
        .values({
            name: data.name,
            buildingId: data.buildingId,
            capacity: data.capacity ?? 0,
            equipment: data.equipment ?? [],
        })
        .returning();
    return result[0]!;
}

export async function updateRoom(
    id: number,
    data: { name?: string | undefined; capacity?: number | undefined; equipment?: string[] | undefined }
) {
    const setValues: any = {};
    if (data.name !== undefined) setValues.name = data.name;
    if (data.capacity !== undefined) setValues.capacity = data.capacity;
    if (data.equipment !== undefined) setValues.equipment = data.equipment;

    const result = await db
        .update(rooms)
        .set(setValues)
        .where(eq(rooms.id, id))
        .returning();
    return result[0] ?? null;
}

export async function deleteRoom(id: number) {
    const result = await db.delete(rooms).where(eq(rooms.id, id)).returning();
    return result[0] ?? null;
}

export async function buildingExists(id: number) {
    const rows = await db
        .select({ id: buildings.id })
        .from(buildings)
        .where(eq(buildings.id, id))
        .limit(1);
    return rows.length > 0;
}

// Room availability — overlapping bookings + unavailability
export async function getOverlappingBookings(
    roomId: number,
    startAt: Date,
    endAt: Date
) {
    return db
        .select({
            id: bookings.id,
            startAt: bookings.startAt,
            endAt: bookings.endAt,
        })
        .from(bookings)
        .where(
            and(
                eq(bookings.roomId, roomId),
                lt(bookings.startAt, endAt),
                gt(bookings.endAt, startAt)
            )
        )
        .orderBy(asc(bookings.startAt));
}

export async function getOverlappingUnavailability(
    roomId: number,
    startAt: Date,
    endAt: Date
) {
    return db
        .select()
        .from(roomUnavailability)
        .where(
            and(
                eq(roomUnavailability.roomId, roomId),
                lt(roomUnavailability.startAt, endAt),
                gt(roomUnavailability.endAt, startAt)
            )
        )
        .orderBy(asc(roomUnavailability.startAt));
}

// Room unavailability management
export async function insertUnavailability(data: {
    roomId: number;
    startAt: Date;
    endAt: Date;
    reason: string;
}) {
    const result = await db
        .insert(roomUnavailability)
        .values(data)
        .returning();
    return result[0]!;
}

export async function deleteUnavailability(id: number) {
    const result = await db
        .delete(roomUnavailability)
        .where(eq(roomUnavailability.id, id))
        .returning();
    return result[0] ?? null;
}

export async function getUnavailabilityById(id: number) {
    const rows = await db
        .select()
        .from(roomUnavailability)
        .where(eq(roomUnavailability.id, id))
        .limit(1);
    return rows[0] ?? null;
}

export async function getUnavailabilityForRoom(roomId: number) {
    return db
        .select()
        .from(roomUnavailability)
        .where(eq(roomUnavailability.roomId, roomId))
        .orderBy(asc(roomUnavailability.startAt));
}
