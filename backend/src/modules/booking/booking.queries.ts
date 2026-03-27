import { db } from "../../db";
import { bookings, rooms } from "../../db/schema";
import { eq, and, lt, gt, ne } from "drizzle-orm";

export async function insertBooking(data: {
    roomId: number;
    startAt: Date;
    endAt: Date;
    requestId?: number | null;
    courseId?: number | null;
}) {
    const result = await db
        .insert(bookings)
        .values({
            roomId: data.roomId,
            startAt: data.startAt,
            endAt: data.endAt,
            requestId: data.requestId ?? null,
            courseId: data.courseId ?? null,
        })
        .returning();
    return result[0]!;
}

export async function getBookingById(id: number) {
    const rows = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);
    return rows[0] ?? null;
}

export async function getBookings(filters: {
    startAt?: Date | undefined;
    endAt?: Date | undefined;
    roomId?: number | undefined;
    buildingId?: number | undefined;
}) {
    const conditions: any[] = [];

    if (filters.roomId !== undefined) {
        conditions.push(eq(bookings.roomId, filters.roomId));
    }

    if (filters.startAt && filters.endAt) {
        conditions.push(
            and(
                lt(bookings.startAt, filters.endAt),
                gt(bookings.endAt, filters.startAt)
            )
        );
    }

    if (filters.buildingId !== undefined) {
        conditions.push(eq(rooms.buildingId, filters.buildingId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    if (filters.buildingId !== undefined) {
        const result = await db
            .select()
            .from(bookings)
            .innerJoin(rooms, eq(bookings.roomId, rooms.id))
            .where(whereClause);
        return result.map((row: any) => row.bookings);
    }

    const query = db.select().from(bookings);
    return whereClause ? query.where(whereClause) : query;
}

export async function deleteBookingById(id: number) {
    const result = await db
        .delete(bookings)
        .where(eq(bookings.id, id))
        .returning();
    return result[0] ?? null;
}

export async function checkRoomOverlap(
    roomId: number,
    startAt: Date,
    endAt: Date,
    excludeId?: number
): Promise<boolean> {
    const conditions = [
        eq(bookings.roomId, roomId),
        lt(bookings.startAt, endAt),
        gt(bookings.endAt, startAt),
    ];

    if (excludeId !== undefined) {
        conditions.push(ne(bookings.id, excludeId));
    }

    const result = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(...conditions))
        .limit(1);

    return result.length > 0;
}

export async function roomExists(id: number) {
    const rows = await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.id, id))
        .limit(1);
    return rows.length > 0;
}
