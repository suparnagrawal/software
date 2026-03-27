import { useState, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { getSlotSystems, createSlotSystem, uploadTimetable, addSlot } from "../api/api";
import type { SlotSystem } from "../api/api";
import { useAuth } from "../auth/AuthContext";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TimetablePage() {
    const { user } = useAuth();
    const [systems, setSystems] = useState<SlotSystem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Upload Form
    const [selectedSystemId, setSelectedSystemId] = useState<number | "">("");
    const [semesterStart, setSemesterStart] = useState("");
    const [semesterEnd, setSemesterEnd] = useState("");
    const [holidays, setHolidays] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // New System Form
    const [newSystemName, setNewSystemName] = useState("");

    // New Slot Form
    const [newSlotSystemId, setNewSlotSystemId] = useState<number | "">("");
    const [newSlotName, setNewSlotName] = useState("");
    const [newSlotDay, setNewSlotDay] = useState<number>(1);
    const [newSlotStart, setNewSlotStart] = useState("08:40");
    const [newSlotEnd, setNewSlotEnd] = useState("09:30");

    const [uploadResult, setUploadResult] = useState<{ message: string; successCount: number; injectionErrors: string[] } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [slotSuccess, setSlotSuccess] = useState<string | null>(null);
    const [systemSuccess, setSystemSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadSystems();
    }, []);

    const loadSystems = async () => {
        setLoading(true);
        try {
            setSystems(await getSlotSystems());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load slot systems");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSystem = async (e: FormEvent) => {
        e.preventDefault();
        if (!newSystemName.trim()) return;
        setSystemSuccess(null);
        try {
            await createSlotSystem(newSystemName);
            setSystemSuccess(`Slot system "${newSystemName}" created!`);
            setNewSystemName("");
            await loadSystems();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create slot system");
        }
    };

    const handleAddSlot = async (e: FormEvent) => {
        e.preventDefault();
        if (newSlotSystemId === "" || !newSlotName.trim()) return;
        setSlotSuccess(null);
        try {
            await addSlot(newSlotSystemId, newSlotName, newSlotDay, newSlotStart, newSlotEnd);
            setSlotSuccess(`Slot "${newSlotName}" added successfully!`);
            setNewSlotName("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to add slot");
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: FormEvent) => {
        e.preventDefault();
        if (selectedSystemId === "" || !semesterStart || !semesterEnd || !file) {
            setError("Please fill all required fields and select a file.");
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadResult(null);

        try {
            const result = await uploadTimetable(
                selectedSystemId,
                semesterStart,
                semesterEnd,
                holidays,
                file
            );
            setUploadResult(result);
            setFile(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to upload timetable");
        } finally {
            setIsUploading(false);
        }
    };

    if (user?.role !== "ADMIN" && user?.role !== "STAFF") {
        return (
            <section>
                <div className="alert alert-error">Access denied. Only Admins and Staff can manage Timetables.</div>
            </section>
        );
    }

    if (loading) return <div className="page-header">Loading timetables...</div>;

    return (
        <section>
            <div className="page-header">
                <h1>Timetable Management</h1>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

                {/* Upload Panel */}
                <div className="card">
                    <h3>Upload Timetable (CSV)</h3>
                    <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                        Format required: <code>CourseCode, RoomName, SlotName</code>
                    </p>
                    <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="form-field">
                            <label>Target Slot System</label>
                            <select className="input" value={selectedSystemId} onChange={(e) => setSelectedSystemId(Number(e.target.value))} required>
                                <option value="" disabled>Select a system...</option>
                                {systems.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label>Semester Start</label>
                                <input type="date" className="input" value={semesterStart} onChange={(e) => setSemesterStart(e.target.value)} required />
                            </div>
                            <div className="form-field">
                                <label>Semester End</label>
                                <input type="date" className="input" value={semesterEnd} onChange={(e) => setSemesterEnd(e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Holidays (Comma separated YYYY-MM-DD)</label>
                            <input type="text" className="input" placeholder="e.g. 2026-04-15, 2026-05-01" value={holidays} onChange={(e) => setHolidays(e.target.value)} />
                        </div>

                        <div className="form-field">
                            <label>CSV File</label>
                            <input type="file" className="input" accept=".csv" onChange={handleFileChange} required />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={isUploading}>
                            {isUploading ? "Uploading & Booking..." : "Upload Timetable"}
                        </button>
                    </form>

                    {uploadResult && (
                        <div className="alert alert-success" style={{ marginTop: "1rem" }}>
                            <h4>{uploadResult.message}</h4>
                            <p>Successfully injected <strong>{uploadResult.successCount}</strong> bookings.</p>
                            {uploadResult.injectionErrors.length > 0 && (
                                <div style={{ marginTop: "0.5rem" }}>
                                    <p><strong>Errors encountered ({uploadResult.injectionErrors.length}):</strong></p>
                                    <ul style={{ maxHeight: "150px", overflowY: "auto", fontSize: "0.85rem", background: "white", padding: "0.5rem", borderRadius: "var(--radius-sm)" }}>
                                        {uploadResult.injectionErrors.map((err, idx) => (
                                            <li key={idx} style={{ color: "var(--danger)" }}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* System & Slot Management Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

                    <div className="card">
                        <h3>Create Slot System</h3>
                        <form onSubmit={handleCreateSystem} className="form-row" style={{ alignItems: "flex-end" }}>
                            <div className="form-field" style={{ flex: 1 }}>
                                <label>System Name</label>
                                <input type="text" className="input" placeholder="e.g. Fall 2026 Normal" value={newSystemName} onChange={(e) => setNewSystemName(e.target.value)} required />
                            </div>
                            <button type="submit" className="btn btn-primary">Create</button>
                        </form>
                        {systemSuccess && <div className="alert alert-success" style={{ marginTop: "0.75rem" }}>{systemSuccess}</div>}
                    </div>

                    <div className="card">
                        <h3>Define Slots</h3>
                        <form onSubmit={handleAddSlot} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div className="form-field">
                                <label>Slot System</label>
                                <select className="input" value={newSlotSystemId} onChange={(e) => setNewSlotSystemId(Number(e.target.value))} required>
                                    <option value="" disabled>Select a system...</option>
                                    {systems.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Slot Name (e.g. M1)</label>
                                    <input type="text" className="input" value={newSlotName} onChange={(e) => setNewSlotName(e.target.value)} required />
                                </div>
                                <div className="form-field">
                                    <label>Day of Week</label>
                                    <select className="input" value={newSlotDay} onChange={(e) => setNewSlotDay(Number(e.target.value))} required>
                                        {DAYS.map((day, idx) => (
                                            <option key={idx} value={idx}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Start Time (HH:MM)</label>
                                    <input type="time" className="input" value={newSlotStart} onChange={(e) => setNewSlotStart(e.target.value)} required />
                                </div>
                                <div className="form-field">
                                    <label>End Time (HH:MM)</label>
                                    <input type="time" className="input" value={newSlotEnd} onChange={(e) => setNewSlotEnd(e.target.value)} required />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary">Add Slot</button>
                        </form>
                        {slotSuccess && <div className="alert alert-success" style={{ marginTop: "0.75rem" }}>{slotSuccess}</div>}
                    </div>

                </div>
            </div>
        </section>
    );
}
