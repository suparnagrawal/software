import { useEffect, useState } from "react";
import { getNotifications, markNotificationRead } from "../api/api";
import type { Notification } from "../api/api";
import { useAuth } from "../auth/AuthContext";

function formatDatetime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export function NotificationsPage() {
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<number | null>(null);

    const loadNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            setNotifications(await getNotifications());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) void loadNotifications();
    }, [user]);

    const handleMarkRead = async (id: number) => {
        setActingId(id);
        setError(null);
        try {
            await markNotificationRead(id);
            await loadNotifications();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to mark as read");
        } finally {
            setActingId(null);
        }
    };

    if (!user) {
        return <div className="alert alert-error">Please sign in to view notifications.</div>;
    }

    return (
        <section>
            <div className="page-header">
                <h2>Notifications</h2>
                <p>Stay updated on your booking requests</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {loading && <p className="loading-text">Loading notifications…</p>}

            {!loading && notifications.length === 0 && (
                <p className="empty-text">No notifications found.</p>
            )}

            {!loading && notifications.length > 0 && (
                <div className="data-list">
                    {notifications.map((n) => {
                        const isActing = actingId === n.id;
                        return (
                            <div className={`data-item ${!n.isRead ? "unread" : ""}`} key={n.id}>
                                <div className="data-item-content">
                                    <div className="data-item-title" style={{ fontWeight: !n.isRead ? "bold" : "normal" }}>
                                        {n.message}
                                    </div>
                                    <div className="data-item-subtitle">
                                        {formatDatetime(n.createdAt)}
                                        {n.relatedRequestId && ` · Request #${n.relatedRequestId}`}
                                    </div>
                                </div>
                                {!n.isRead && (
                                    <div className="data-item-actions">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={isActing}
                                            onClick={() => void handleMarkRead(n.id)}
                                        >
                                            {isActing ? "Working…" : "Mark Read"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
