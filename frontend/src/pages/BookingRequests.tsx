import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  approveBookingRequest,
  cancelBookingRequest,
  createBookingRequest,
  forwardBookingRequest,
  getBookingRequests,
  getRooms,
  rejectBookingRequest,
  ApiError,
  getBookings,
} from "../api/api";
import type { BookingRequest, BookingStatus, Room, Booking } from "../api/api";
import { useAuth } from "../auth/AuthContext";

type StatusFilter = "ALL" | BookingStatus;

const STATUS_OPTIONS: StatusFilter[] = [
  "ALL",
  "PENDING_FACULTY",
  "PENDING_STAFF",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING_FACULTY: "Pending Faculty",
  PENDING_STAFF: "Pending Staff",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function statusBadgeClass(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    PENDING_FACULTY: "badge-pending-faculty",
    PENDING_STAFF: "badge-pending-staff",
    APPROVED: "badge-approved",
    REJECTED: "badge-rejected",
    CANCELLED: "badge-cancelled",
  };
  return `badge ${map[status]}`;
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BookingRequestsPage() {
  const { user } = useAuth();
  const currentRole = user?.role ?? null;
  const canCreate = currentRole === "STUDENT" || currentRole === "FACULTY";

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Room[] | null>(null);

  const [roomId, setRoomId] = useState<number | "">("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [purpose, setPurpose] = useState("");
  const [courseId, setCourseId] = useState<number | "">("");
  const [studentCount, setStudentCount] = useState<number | "">("");
  const [requiredEquipment, setRequiredEquipment] = useState("");
  const [type, setType] = useState<"NEW_BOOKING" | "SLOT_CHANGE" | "ROOM_CHANGE">("NEW_BOOKING");
  const [originalBookingId, setOriginalBookingId] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));

  const loadRequests = async (filter: StatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await getBookingRequests(filter === "ALL" ? undefined : filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load booking requests");
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try { setRooms(await getRooms()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load rooms"); }
  };

  useEffect(() => {
    void (async () => {
      await loadRooms();
      await loadRequests("ALL");
      if (user) {
        try {
          const allB = await getBookings();
          // Assume the user only cares about their own requests/bookings
          // In reality, this endpoint should naturally filter by user, but let's safely map them
          setMyBookings(allB);
        } catch (e) {
          console.error("Failed to load my bookings", e);
        }
      }
    })();
  }, [user]);

  const handleFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    void loadRequests(value);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (roomId === "") { setError("Room is required"); return; }
    if (!startAt || !endAt) { setError("Start and end times are required"); return; }
    const trimmedPurpose = purpose.trim();
    if (!trimmedPurpose) { setError("Purpose is required"); return; }
    if ((type === "SLOT_CHANGE" || type === "ROOM_CHANGE") && originalBookingId === "") {
      setError("Original Booking ID is required for change requests");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuggestions(null);
    try {
      await createBookingRequest({
        roomId,
        startAt,
        endAt,
        purpose: trimmedPurpose,
        courseId: courseId === "" ? undefined : courseId,
        studentCount: studentCount === "" ? undefined : studentCount,
        requiredEquipment: requiredEquipment.trim() ? requiredEquipment.split(",").map(e => e.trim()).filter(Boolean) : undefined,
        type,
        originalBookingId: originalBookingId === "" ? undefined : originalBookingId,
      });
      setRoomId("");
      setStartAt("");
      setEndAt("");
      setPurpose("");
      setCourseId("");
      setStudentCount("");
      setRequiredEquipment("");
      setType("NEW_BOOKING");
      setOriginalBookingId("");
      await loadRequests(statusFilter);
    } catch (e) {
      if (e instanceof ApiError && e.suggestions?.length) {
        setSuggestions(e.suggestions);
      }
      setError(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAction = async (id: number, action: () => Promise<void>) => {
    setActingId(id);
    setError(null);
    try {
      await action();
      await loadRequests(statusFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <section>
      <div className="page-header">
        <h2>Booking Requests</h2>
        <p>Submit and manage room booking requests</p>
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`filter-chip ${statusFilter === s ? "active" : ""}`}
            onClick={() => handleFilterChange(s)}
          >
            {s === "ALL" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Create form */}
      {canCreate && (
        <form className="card section-gap" onSubmit={handleCreate}>
          <div className="card-header">
            <h3>New Request</h3>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="newRequestType">Request Type</label>
              <select
                id="newRequestType"
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={isSubmitting}
              >
                <option value="NEW_BOOKING">New Booking</option>
                <option value="SLOT_CHANGE">Slot Change</option>
                <option value="ROOM_CHANGE">Room Change</option>
              </select>
            </div>
            {(type === "SLOT_CHANGE" || type === "ROOM_CHANGE") && (
              <div className="form-field">
                <label htmlFor="newRequestOrigBooking">Original Booking</label>
                <select
                  id="newRequestOrigBooking"
                  className="input"
                  value={originalBookingId}
                  onChange={(e) => setOriginalBookingId(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isSubmitting}
                  required
                >
                  <option value="" disabled>Select an active booking to change...</option>
                  {myBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      Booking #{b.id} — Room: {roomNameById.get(b.roomId) ?? b.roomId} ({new Date(b.startAt).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="newRequestRoomId">Room</label>
              <select
                id="newRequestRoomId"
                className="input"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={isSubmitting}
              >
                <option value="">Select a room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (#{r.id})</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="newRequestStartAt">Start</label>
              <input
                id="newRequestStartAt"
                className="input"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="form-field">
              <label htmlFor="newRequestEndAt">End</label>
              <input
                id="newRequestEndAt"
                className="input"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="newRequestPurpose">Purpose</label>
              <input
                id="newRequestPurpose"
                className="input"
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Why do you need this room?"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-field">
              <label htmlFor="newRequestCourseId">Course ID (optional)</label>
              <input
                id="newRequestCourseId"
                className="input"
                type="number"
                min="1"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 1 (for CS101)"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="newRequestStudentCount">Student Count (optional)</label>
              <input
                id="newRequestStudentCount"
                className="input"
                type="number"
                min="1"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 50"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-field">
              <label htmlFor="newRequestEquipment">Required Equipment (comma-separated)</label>
              <input
                id="newRequestEquipment"
                className="input"
                type="text"
                value={requiredEquipment}
                onChange={(e) => setRequiredEquipment(e.target.value)}
                placeholder="e.g. Projector, Whiteboard"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {suggestions && suggestions.length > 0 && (
        <div className="card section-gap suggestions-box" style={{ background: "var(--surface-50)", border: "1px solid var(--primary-light)" }}>
          <div className="card-header">
            <h4 style={{ color: "var(--primary-dark)", margin: 0 }}>Available Alternative Rooms</h4>
            <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              The following rooms are available during your requested time and meet your capacity/equipment needs.
            </p>
          </div>
          <div style={{ padding: "var(--space-4)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {suggestions.map((s) => (
              <div key={s.id} className="card" style={{ padding: "1rem", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{s.name}</div>
                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                  <div><strong>Capacity:</strong> {s.capacity || "N/A"}</div>
                  {s.equipment && s.equipment.length > 0 && <div><strong>Equipment:</strong> {s.equipment.join(", ")}</div>}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: "auto" }}
                  title="Clicking this will automatically fill the Room selection above."
                  onClick={() => {
                    setRoomId(s.id);
                    setSuggestions(null);
                    setError(null);
                  }}
                >
                  Select Room
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="loading-text">Loading requests…</p>}
      {!loading && requests.length === 0 && <p className="empty-text">No booking requests found.</p>}

      {!loading && requests.length > 0 && (
        <div className="data-list">
          {requests.map((req) => {
            const isPendingFaculty = req.status === "PENDING_FACULTY";
            const isPendingStaff = req.status === "PENDING_STAFF";
            const isPending = isPendingFaculty || isPendingStaff;
            const isOwnRequest = user ? req.userId === user.id : false;
            const isActing = actingId === req.id;

            const canForward = currentRole === "FACULTY" && isPendingFaculty;
            const canApprove = currentRole === "STAFF" && isPendingStaff;
            const canReject =
              (currentRole === "FACULTY" && isPendingFaculty) ||
              (currentRole === "STAFF" && isPendingStaff);
            const canCancel = (currentRole === "ADMIN" || isOwnRequest) && isPending;

            const hasActions = canForward || canApprove || canReject || canCancel;

            return (
              <div className="request-card" key={req.id}>
                <div className="request-card-header">
                  <span className="data-item-title">
                    Request #{req.id} {req.type && req.type !== "NEW_BOOKING" && <span className="badge badge-pending-faculty" style={{ marginLeft: 8 }}>{req.type.replace("_", " ")}</span>}
                  </span>
                  <span className={statusBadgeClass(req.status)}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>

                <div className="request-card-meta">
                  {req.originalBookingId && <span><strong>Original Booking ID:</strong> #{req.originalBookingId}</span>}
                  <span><strong>Room:</strong> {roomNameById.get(req.roomId) ?? `#${req.roomId}`}</span>
                  <span><strong>From:</strong> {formatDatetime(req.startAt)}</span>
                  <span><strong>To:</strong> {formatDatetime(req.endAt)}</span>
                  {req.courseId !== null && req.courseId !== undefined && <span><strong>Course:</strong> #{req.courseId}</span>}
                  {req.studentCount !== null && req.studentCount !== undefined && <span><strong>Students:</strong> {req.studentCount}</span>}
                  {req.requiredEquipment && req.requiredEquipment.length > 0 && <span><strong>Eq:</strong> {req.requiredEquipment.join(", ")}</span>}
                </div>

                {req.purpose && (
                  <div className="request-card-purpose">
                    💬 {req.purpose}
                  </div>
                )}

                {hasActions && (
                  <div className="request-card-actions">
                    {canForward && (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        disabled={isActing}
                        onClick={() => void runAction(req.id, () => forwardBookingRequest(req.id))}
                      >
                        {isActing ? "Working…" : "Forward to Staff"}
                      </button>
                    )}
                    {canApprove && (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={isActing}
                        onClick={() => void runAction(req.id, () => approveBookingRequest(req.id))}
                      >
                        {isActing ? "Working…" : "Approve"}
                      </button>
                    )}
                    {canReject && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={isActing}
                        onClick={() => void runAction(req.id, () => rejectBookingRequest(req.id))}
                      >
                        {isActing ? "Working…" : "Reject"}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={isActing}
                        onClick={() => void runAction(req.id, () => cancelBookingRequest(req.id))}
                      >
                        {isActing ? "Working…" : "Cancel"}
                      </button>
                    )}
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