import * as queries from "./notifications.queries";
import { db } from "../../db";
import { users, staffBuildings, rooms, bookingRequests } from "../../db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../lib/errors";

type NotificationEvent =
    | "REQUEST_CREATED"
    | "REQUEST_FORWARDED"
    | "REQUEST_APPROVED"
    | "REQUEST_REJECTED"
    | "REQUEST_CANCELLED";

// Get all user IDs with a specific role
async function getUserIdsByRole(role: string): Promise<number[]> {
    const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, role as any));
    return rows.map((r) => r.id);
}

// Get staff IDs for a specific building
async function getStaffForBuilding(buildingId: number): Promise<number[]> {
    const rows = await db
        .select({ userId: staffBuildings.userId })
        .from(staffBuildings)
        .where(eq(staffBuildings.buildingId, buildingId));
    return rows.map((r) => r.userId);
}

// Get room's building ID
async function getBuildingIdForRoom(roomId: number): Promise<number | null> {
    const row = await db
        .select({ buildingId: rooms.buildingId })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1);
    return row[0]?.buildingId ?? null;
}

export async function triggerNotification(
    event: NotificationEvent,
    request: { id: number; roomId?: number; userId?: number | null }
) {
    const requestId = request.id;

    // Fetch full request data if needed
    let fullRequest = request as any;
    if (!request.roomId || request.userId === undefined) {
        const row = await db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.id, requestId))
            .limit(1);
        if (row[0]) fullRequest = row[0];
    }

    const notifications: Array<{ userId: number; message: string }> = [];

    switch (event) {
        case "REQUEST_CREATED": {
            // Notify all faculty about new student requests
            const facultyIds = await getUserIdsByRole("FACULTY");
            for (const fId of facultyIds) {
                if (fId !== fullRequest.userId) {
                    notifications.push({
                        userId: fId,
                        message: `New booking request #${requestId} needs review`,
                    });
                }
            }
            break;
        }

        case "REQUEST_FORWARDED": {
            // Notify staff of the building
            const buildingId = await getBuildingIdForRoom(fullRequest.roomId);
            if (buildingId) {
                const staffIds = await getStaffForBuilding(buildingId);
                // Also notify all STAFF role users (fallback if no staff_buildings assignments)
                const allStaffIds = staffIds.length > 0 ? staffIds : await getUserIdsByRole("STAFF");
                for (const sId of allStaffIds) {
                    notifications.push({
                        userId: sId,
                        message: `Booking request #${requestId} has been forwarded for staff approval`,
                    });
                }
            }
            break;
        }

        case "REQUEST_APPROVED": {
            // Notify requester
            if (fullRequest.userId) {
                notifications.push({
                    userId: fullRequest.userId,
                    message: `Your booking request #${requestId} has been approved`,
                });
            }
            break;
        }

        case "REQUEST_REJECTED": {
            // Notify requester
            if (fullRequest.userId) {
                notifications.push({
                    userId: fullRequest.userId,
                    message: `Your booking request #${requestId} has been rejected`,
                });
            }
            break;
        }

        case "REQUEST_CANCELLED": {
            // Notify relevant staff/faculty
            const buildingId = await getBuildingIdForRoom(fullRequest.roomId);
            if (buildingId) {
                const staffIds = await getStaffForBuilding(buildingId);
                for (const sId of staffIds) {
                    notifications.push({
                        userId: sId,
                        message: `Booking request #${requestId} has been cancelled`,
                    });
                }
            }
            break;
        }
    }

    // Batch insert all notifications
    for (const n of notifications) {
        try {
            await queries.insertNotification({
                userId: n.userId,
                message: n.message,
                relatedRequestId: requestId,
            });
        } catch {
            // Individual notification failure should not break the flow
        }
    }
}

export async function listNotifications(userId: number) {
    return queries.getNotificationsForUser(userId);
}

export async function markNotificationRead(
    notificationId: number,
    userId: number
) {
    const result = await queries.markAsRead(notificationId, userId);
    if (!result) throw new NotFoundError("Notification");
    return result;
}
