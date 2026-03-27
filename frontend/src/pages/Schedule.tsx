import { useState, useEffect } from "react";
import { getBookings, getBookingRequests, getRooms } from "../api/api";
import type { Booking, BookingRequest, Room } from "../api/api";
import { useAuth } from "../auth/AuthContext";

function formatDT(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export function SchedulePage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [requests, setRequests] = useState<BookingRequest[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) void loadSchedule();
    }, [user]);

    const loadSchedule = async () => {
        setLoading(true);
        setError(null);
        try {
            const [allBookings, allRequests, allRooms] = await Promise.all([
                getBookings(),
                getBookingRequests(),
                getRooms(),
            ]);

            setRooms(allRooms);

            const userRequests = allRequests.filter((r) => r.userId === user?.id);
            const userRequestIds = new Set(userRequests.map((r) => r.id));
            const myBookings = allBookings.filter(
                (b) => b.requestId && userRequestIds.has(b.requestId),
            );

            setBookings(myBookings);
            setRequests(userRequests);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load schedule");
        } finally {
            setLoading(false);
        }
    };

    const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));

    const pendingRequests = requests.filter((r) => r.status.startsWith("PENDING"));
    const approvedRequests = requests.filter((r) => r.status === "APPROVED");

    if (loading) {
        return (
            <section>
                <div className="page-header"><h1>My Schedule</h1></div>
                <div style={{ display: "flex", justifyContent: "center", padding: "3rem", gap: "1rem", alignItems: "center" }}>
                    <div className="loading-spinner"></div>
                    <span className="text-muted">Loading your schedule...</span>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <div className="page-header"><h1>My Schedule</h1></div>
                <div className="alert alert-error">{error}</div>
            </section>
        );
    }

    return (
        <section>
            <div className="page-header">
                <h1>My Schedule</h1>
                <p>Your confirmed bookings and pending requests</p>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <div className="card" style={{ padding: "1rem 1.5rem", flex: 1, minWidth: "140px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--green-600)" }}>{bookings.length}</div>
                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Confirmed Bookings</div>
                </div>
                <div className="card" style={{ padding: "1rem 1.5rem", flex: 1, minWidth: "140px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--amber-600)" }}>{pendingRequests.length}</div>
                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Pending Requests</div>
                </div>
                <div className="card" style={{ padding: "1rem 1.5rem", flex: 1, minWidth: "140px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary-600)" }}>{approvedRequests.length}</div>
                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Approved Requests</div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                {/* Confirmed Bookings */}
                <div className="card">
                    <div className="card-header"><h3>📅 Confirmed Bookings</h3></div>
                    {bookings.length === 0 ? (
                        <p className="text-muted" style={{ padding: "1rem 0" }}>No confirmed bookings yet.</p>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Room</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Course</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((b) => (
                                    <tr key={b.id}>
                                        <td><strong>{roomNameById.get(b.roomId) ?? `Room #${b.roomId}`}</strong></td>
                                        <td>{formatDT(b.startAt)}</td>
                                        <td>{formatDT(b.endAt)}</td>
                                        <td>{b.courseId ? `#${b.courseId}` : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pending Requests */}
                <div className="card">
                    <div className="card-header"><h3>⏳ Pending Requests</h3></div>
                    {pendingRequests.length === 0 ? (
                        <p className="text-muted" style={{ padding: "1rem 0" }}>No pending requests.</p>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Room</th>
                                    <th>Purpose</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map((r) => (
                                    <tr key={r.id}>
                                        <td><strong>{roomNameById.get(r.roomId) ?? `Room #${r.roomId}`}</strong></td>
                                        <td>{r.purpose || "—"}</td>
                                        <td style={{ fontSize: "0.8rem" }}>{formatDT(r.startAt)}</td>
                                        <td>
                                            <span className={`badge ${r.status === "PENDING_FACULTY" ? "badge-pending-faculty" : "badge-pending-staff"}`}>
                                                {r.status === "PENDING_FACULTY" ? "Faculty" : "Staff"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </section>
    );
}
