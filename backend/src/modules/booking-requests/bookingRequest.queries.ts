import { db } from "../../db";
import { bookingRequests, bookings, rooms, staffBuildings } from "../../db/schema";
import { eq, and, or, lt, gt, inArray } from "drizzle-orm";

export async function getRequestById(id: number) {
    const rows = await db
        .select()
        .from(bookingRequests)
        .where(eq(bookingRequests.id, id))
        .limit(1);
    return rows[0] ?? null;
}

export async function getRequestsForRole(
    actingUser: { id: number; role: string },
    filters: { status?: string | undefined },
    staffBuildingIds?: number[] | undefined
) {
    const { role } = actingUser;
    const userId = actingUser.id;

    let visibilityCondition;

    if (role === "ADMIN") {
        visibilityCondition = undefined;
    } else if (role === "STUDENT") {
        visibilityCondition = eq(bookingRequests.userId, userId);
    } else if (role === "FACULTY") {
        visibilityCondition = or(
            eq(bookingRequests.userId, userId),
            eq(bookingRequests.status, "PENDING_FACULTY")
        );
    } else if (role === "STAFF") {
        // STAFF sees PENDING_STAFF for rooms in their assigned buildings
        if (staffBuildingIds && staffBuildingIds.length > 0) {
            visibilityCondition = and(
                eq(bookingRequests.status, "PENDING_STAFF"),
                inArray(rooms.buildingId, staffBuildingIds)
            );
        } else {
            visibilityCondition = eq(bookingRequests.status, "PENDING_STAFF");
        }
    }

    const statusCondition = filters.status
        ? eq(bookingRequests.status, filters.status as any)
        : undefined;

    const whereClause =
        visibilityCondition && statusCondition
            ? and(visibilityCondition, statusCondition)
            : visibilityCondition ?? statusCondition;

    // For STAFF with building filtering, we need to JOIN with rooms
    if (role === "STAFF" && staffBuildingIds && staffBuildingIds.length > 0) {
        const result = await db
            .select({ bookingRequests: bookingRequests })
            .from(bookingRequests)
            .innerJoin(rooms, eq(bookingRequests.roomId, rooms.id))
            .where(whereClause);
        return result.map((r) => r.bookingRequests);
    }

    if (whereClause) {
        return db.select().from(bookingRequests).where(whereClause);
    }
    return db.select().from(bookingRequests);
}

export async function insertRequest(data: {
    userId: number;
    roomId: number;
    startAt: Date;
    endAt: Date;
    purpose: string;
    status: "PENDING_FACULTY" | "PENDING_STAFF";
    courseId?: number | null;
    studentCount?: number | null;
    requiredEquipment?: string[] | null;
    type?: "NEW_BOOKING" | "SLOT_CHANGE" | "ROOM_CHANGE";
    originalBookingId?: number | null;
}) {
    const result = await db
        .insert(bookingRequests)
        .values({
            userId: data.userId,
            roomId: data.roomId,
            startAt: data.startAt,
            endAt: data.endAt,
            purpose: data.purpose,
            status: data.status,
            courseId: data.courseId ?? null,
            studentCount: data.studentCount ?? null,
            requiredEquipment: data.requiredEquipment ?? null,
            type: data.type ?? "NEW_BOOKING",
            originalBookingId: data.originalBookingId ?? null,
        })
        .returning();
    return result[0]!;
}

export async function updateRequestStatus(
    id: number,
    status: "PENDING_STAFF" | "APPROVED" | "REJECTED" | "CANCELLED"
) {
    const result = await db
        .update(bookingRequests)
        .set({ status })
        .where(eq(bookingRequests.id, id))
        .returning();
    return result[0] ?? null;
}

export async function checkDuplicatePending(
    userId: number,
    roomId: number,
    startAt: Date,
    endAt: Date
) {
    const overlap = await db
        .select({ id: bookingRequests.id })
        .from(bookingRequests)
        .where(
            and(
                eq(bookingRequests.userId, userId),
                eq(bookingRequests.roomId, roomId),
                or(
                    eq(bookingRequests.status, "PENDING_FACULTY"),
                    eq(bookingRequests.status, "PENDING_STAFF")
                ),
                lt(bookingRequests.startAt, endAt),
                gt(bookingRequests.endAt, startAt)
            )
        )
        .limit(1);
    return overlap.length > 0;
}

export async function getStaffBuildingIds(userId: number): Promise<number[]> {
    const rows = await db
        .select({ buildingId: staffBuildings.buildingId })
        .from(staffBuildings)
        .where(eq(staffBuildings.userId, userId));
    return rows.map((r) => r.buildingId);
}
