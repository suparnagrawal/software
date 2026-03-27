import { db } from "../../db";
import { notifications } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function insertNotification(data: {
    userId: number;
    message: string;
    relatedRequestId?: number | null;
}) {
    const result = await db
        .insert(notifications)
        .values({
            userId: data.userId,
            message: data.message,
            relatedRequestId: data.relatedRequestId ?? null,
        })
        .returning();
    return result[0]!;
}

export async function getNotificationsForUser(userId: number) {
    return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
}

export async function markAsRead(notificationId: number, userId: number) {
    const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
            and(
                eq(notifications.id, notificationId),
                eq(notifications.userId, userId)
            )
        )
        .returning();
    return result[0] ?? null;
}
