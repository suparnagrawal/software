import { db } from "../../db";
import { buildings, rooms, bookings, roomUnavailability } from "../../db/schema";
import { eq, and, lt, gt, asc, sql } from "drizzle-orm";

export interface AvailabilityRow {
    buildingId: number;
    buildingName: string;
    roomId: number;
    roomName: string;
    bookingCount: number;
    unavailabilityCount: number;
}

export async function getAvailabilityData(
    startAt: Date,
    endAt: Date,
    buildingId?: number
): Promise<AvailabilityRow[]> {
    const rows = await db
        .select({
            buildingId: buildings.id,
            buildingName: buildings.name,
            roomId: rooms.id,
            roomName: rooms.name,
            bookingCount: sql<number>`count(DISTINCT ${bookings.id})`,
            unavailabilityCount: sql<number>`count(DISTINCT ${roomUnavailability.id})`,
        })
        .from(rooms)
        .innerJoin(buildings, eq(rooms.buildingId, buildings.id))
        .leftJoin(
            bookings,
            and(
                eq(bookings.roomId, rooms.id),
                lt(bookings.startAt, endAt),
                gt(bookings.endAt, startAt)
            )
        )
        .leftJoin(
            roomUnavailability,
            and(
                eq(roomUnavailability.roomId, rooms.id),
                lt(roomUnavailability.startAt, endAt),
                gt(roomUnavailability.endAt, startAt)
            )
        )
        .where(buildingId !== undefined ? eq(rooms.buildingId, buildingId) : undefined)
        .groupBy(buildings.id, buildings.name, rooms.id, rooms.name)
        .orderBy(asc(buildings.name), asc(rooms.name));

    return rows;
}

// For suggestions: rooms with NO overlapping bookings or unavailability
export async function getAvailableRooms(startAt: Date, endAt: Date) {
    const rows = await db
        .select({
            id: rooms.id,
            name: rooms.name,
            buildingId: rooms.buildingId,
            capacity: rooms.capacity,
            equipment: rooms.equipment,
            bookingCount: sql<number>`count(DISTINCT ${bookings.id})`,
            unavailabilityCount: sql<number>`count(DISTINCT ${roomUnavailability.id})`,
        })
        .from(rooms)
        .leftJoin(
            bookings,
            and(
                eq(bookings.roomId, rooms.id),
                lt(bookings.startAt, endAt),
                gt(bookings.endAt, startAt)
            )
        )
        .leftJoin(
            roomUnavailability,
            and(
                eq(roomUnavailability.roomId, rooms.id),
                lt(roomUnavailability.startAt, endAt),
                gt(roomUnavailability.endAt, startAt)
            )
        )
        .groupBy(rooms.id, rooms.name, rooms.buildingId, rooms.capacity, rooms.equipment)
        .having(
            and(
                sql`count(DISTINCT ${bookings.id}) = 0`,
                sql`count(DISTINCT ${roomUnavailability.id}) = 0`
            )
        );

    return rows;
}
