import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createRoom,
  deleteRoom,
  getBuildings,
  getRooms,
  updateRoom,
  getRoomUnavailability,
  createRoomUnavailability,
  deleteRoomUnavailability,
} from "../api/api";
import type { Building, Room, RoomUnavailability } from "../api/api";
import { useAuth } from "../auth/AuthContext";

export function RoomsPage() {
  const { user } = useAuth();
  const canMutate = user?.role === "ADMIN" || user?.role === "STAFF";

  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | "all">("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newBuildingId, setNewBuildingId] = useState<number | "">("");
  const [newCapacity, setNewCapacity] = useState<number | "">("");
  const [newEquipment, setNewEquipment] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCapacity, setEditingCapacity] = useState<number | "">("");
  const [editingEquipment, setEditingEquipment] = useState("");

  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Unavailability State
  const [unavailabilities, setUnavailabilities] = useState<Record<number, RoomUnavailability[]>>({});
  const [loadingUnavailability, setLoadingUnavailability] = useState<number | null>(null);
  const [newUnavailStart, setNewUnavailStart] = useState("");
  const [newUnavailEnd, setNewUnavailEnd] = useState("");
  const [newUnavailReason, setNewUnavailReason] = useState("");
  const [isSubmittingUnavail, setIsSubmittingUnavail] = useState(false);

  const buildingNameById = new Map(buildings.map((b) => [b.id, b.name]));

  // Helper
  const formatDatetime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  const loadBuildings = async () => {
    try {
      setBuildings(await getBuildings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load buildings");
    }
  };

  const loadRooms = async (buildingId: number | "all") => {
    setLoading(true);
    setError(null);
    try {
      setRooms(await getRooms(buildingId === "all" ? undefined : buildingId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadBuildings();
      await loadRooms("all");
    })();
  }, []);

  const handleFilterChange = async (value: string) => {
    const next = value === "all" ? "all" as const : Number(value);
    setSelectedBuildingId(next);
    await loadRooms(next);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) { setError("Room name is required"); return; }
    if (newBuildingId === "") { setError("Building is required"); return; }

    const cap = newCapacity === "" ? undefined : newCapacity;
    const eq = newEquipment.trim() ? newEquipment.split(",").map(e => e.trim()).filter(Boolean) : undefined;

    setIsSubmitting(true);
    setError(null);
    try {
      await createRoom(trimmed, newBuildingId, cap, eq);
      setNewName("");
      setNewCapacity("");
      setNewEquipment("");
      await loadRooms(selectedBuildingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) { setError("Room name is required"); return; }

    const cap = editingCapacity === "" ? undefined : editingCapacity;
    const eq = editingEquipment.trim() ? editingEquipment.split(",").map(e => e.trim()).filter(Boolean) : undefined;

    setIsUpdating(true);
    setError(null);
    try {
      await updateRoom(id, trimmed, cap, eq);
      setEditingId(null);
      setEditingName("");
      setEditingCapacity("");
      setEditingEquipment("");
      await loadRooms(selectedBuildingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update room");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteRoom(id);
      await loadRooms(selectedBuildingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete room");
    } finally {
      setDeletingId(null);
    }
  };

  const loadUnavailability = async (roomId: number) => {
    setLoadingUnavailability(roomId);
    try {
      const data = await getRoomUnavailability(roomId);
      setUnavailabilities((prev) => ({ ...prev, [roomId]: data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load unavailability");
    } finally {
      setLoadingUnavailability(null);
    }
  };

  const handleCreateUnavailability = async (roomId: number) => {
    if (!newUnavailStart || !newUnavailEnd || !newUnavailReason.trim()) {
      setError("Start, end, and reason are required for unavailability");
      return;
    }
    setIsSubmittingUnavail(true);
    setError(null);
    try {
      await createRoomUnavailability(roomId, {
        startAt: newUnavailStart,
        endAt: newUnavailEnd,
        reason: newUnavailReason.trim(),
      });
      setNewUnavailStart("");
      setNewUnavailEnd("");
      setNewUnavailReason("");
      await loadUnavailability(roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add unavailability");
    } finally {
      setIsSubmittingUnavail(false);
    }
  };

  const handleDeleteUnavailability = async (roomId: number, unavailId: number) => {
    try {
      await deleteRoomUnavailability(unavailId);
      await loadUnavailability(roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete unavailability");
    }
  };

  return (
    <section>
      <div className="page-header">
        <h2>Rooms</h2>
        <p>View and manage rooms across campus buildings</p>
      </div>

      {/* Filter */}
      <div className="card section-gap">
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="roomBuildingFilter">Filter by building</label>
            <select
              id="roomBuildingFilter"
              className="input"
              value={selectedBuildingId}
              onChange={(e) => void handleFilterChange(e.target.value)}
            >
              <option value="all">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create form */}
      {canMutate && (
        <form className="card section-gap" onSubmit={handleCreate}>
          <div className="card-header">
            <h3>Add Room</h3>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="newRoomName">Room name</label>
              <input
                id="newRoomName"
                className="input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Lab 101"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-field">
              <label htmlFor="newRoomBuilding">Building</label>
              <select
                id="newRoomBuilding"
                className="input"
                value={newBuildingId}
                onChange={(e) => setNewBuildingId(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={isSubmitting}
              >
                <option value="">Select a building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="newRoomCapacity">Capacity</label>
              <input
                id="newRoomCapacity"
                className="input"
                type="number"
                min="0"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 50"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-field">
              <label htmlFor="newRoomEquipment">Equipment (comma-separated)</label>
              <input
                id="newRoomEquipment"
                className="input"
                type="text"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                placeholder="e.g. Projector, Whiteboard"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add Room"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="loading-text">Loading rooms…</p>}
      {!loading && rooms.length === 0 && <p className="empty-text">No rooms found.</p>}

      {!loading && rooms.length > 0 && (
        <div className="data-list">
          {rooms.map((room) => {
            const isEditing = editingId === room.id;
            const isDeleting = deletingId === room.id;
            const roomUnavail = unavailabilities[room.id] || [];
            const isLoadingUnavail = loadingUnavailability === room.id;

            return (
              <div className="data-item" key={room.id}>
                {isEditing ? (
                  <>
                    <div className="inline-edit" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        className="input"
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={isUpdating}
                        placeholder="Room name (e.g. Lab 101)"
                        autoFocus
                      />
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={editingCapacity}
                        onChange={(e) => setEditingCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                        disabled={isUpdating}
                        placeholder="Capacity (e.g. 50)"
                      />
                      <input
                        className="input"
                        type="text"
                        value={editingEquipment}
                        onChange={(e) => setEditingEquipment(e.target.value)}
                        disabled={isUpdating}
                        placeholder="Equipment (e.g. Projector, Mic)"
                      />

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isUpdating}
                        onClick={() => void handleUpdate(room.id)}
                      >
                        {isUpdating ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={isUpdating}
                        onClick={() => { setEditingId(null); setEditingName(""); setEditingCapacity(""); setEditingEquipment(""); }}
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Unavailability Management Section */}
                    <div className="section-gap" style={{ marginTop: "1rem", padding: "1rem", background: "var(--surface-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                      <h4 style={{ margin: "0 0 1rem 0" }}>Manage Unavailability (Blocks)</h4>
                      {isLoadingUnavail ? (
                        <p className="loading-text">Loading blocks…</p>
                      ) : (
                        <>
                          {roomUnavail.length > 0 && (
                            <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {roomUnavail.map((u) => (
                                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", background: "white", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                                  <span><strong>{u.reason}</strong> · {formatDatetime(u.startAt)} – {formatDatetime(u.endAt)}</span>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void handleDeleteUnavailability(room.id, u.id)}>Delete</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                            <input type="datetime-local" className="input" value={newUnavailStart} onChange={(e) => setNewUnavailStart(e.target.value)} disabled={isSubmittingUnavail} />
                            <input type="datetime-local" className="input" value={newUnavailEnd} onChange={(e) => setNewUnavailEnd(e.target.value)} disabled={isSubmittingUnavail} />
                            <input type="text" className="input" placeholder="Reason (e.g. Maintenance)" value={newUnavailReason} onChange={(e) => setNewUnavailReason(e.target.value)} disabled={isSubmittingUnavail} />
                            <button type="button" className="btn btn-warning btn-sm" onClick={() => void handleCreateUnavailability(room.id)} disabled={isSubmittingUnavail}>
                              {isSubmittingUnavail ? "Adding…" : "Add Block"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="data-item-content">
                      <div className="data-item-title">{room.name}</div>
                      <div className="data-item-subtitle" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                        <div>{buildingNameById.get(room.buildingId) ?? `Building #${room.buildingId}`} · ID: {room.id}</div>
                        {(room.capacity !== undefined || (room.equipment && room.equipment.length > 0)) && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {room.capacity !== undefined ? `Capacity: ${room.capacity}` : "Capacity: Any"}
                            {room.equipment && room.equipment.length > 0 ? ` · Equipment: ${room.equipment.join(", ")}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                    {canMutate && (
                      <div className="data-item-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingId(room.id);
                            setEditingName(room.name);
                            setEditingCapacity(room.capacity ?? "");
                            setEditingEquipment(room.equipment?.join(", ") ?? "");
                            void loadUnavailability(room.id);
                          }}
                        >
                          Rename/Edit/Block
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={isDeleting}
                          onClick={() => void handleDelete(room.id)}
                        >
                          {isDeleting ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}