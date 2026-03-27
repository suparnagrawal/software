import { convertSlotToDatetimes, SlotDefinition } from "./slotConverter";
import { createDirectBooking } from "../booking/booking.service";
import { parse } from "csv-parse/sync";
import { db } from "../../db";
import { courses, rooms, slots, slotSystems } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";

export async function parseAndPrebookTimetable(
    fileBuffer: Buffer,
    params: {
        slotSystemId: number;
        semesterStart: Date;
        semesterEnd: Date;
        holidays: Date[];
    },
    actingAdmin: { id: number; role: string }
) {
    const { slotSystemId, semesterStart, semesterEnd, holidays } = params;

    if (isNaN(semesterStart.getTime()) || isNaN(semesterEnd.getTime()) || semesterStart >= semesterEnd) {
        throw new ValidationError("Invalid semester dates");
    }

    // Parse CSV
    const csvContent = fileBuffer.toString("utf8");
    let records: any[];
    try {
        records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
    } catch {
        throw new ValidationError("Failed to parse CSV format. Ensure it has headers: CourseCode, RoomName, SlotName");
    }

    // Fetch dependencies for validation
    const sysSlots = await db.select().from(slots).where(eq(slots.slotSystemId, slotSystemId));
    if (sysSlots.length === 0) {
        throw new NotFoundError("Slot system or no slots defined for this system");
    }

    const dbCourses = await db.select().from(courses);
    const dbRooms = await db.select().from(rooms);

    const slotMap = new Map<string, { startTime: string; endTime: string; daysOfWeek: string[] }>();
    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const s of sysSlots) {
        const existing = slotMap.get(s.name);
        if (existing) {
            existing.daysOfWeek.push(DAY_NAMES[s.dayOfWeek]!);
        } else {
            slotMap.set(s.name, {
                startTime: s.startTime,
                endTime: s.endTime,
                daysOfWeek: [DAY_NAMES[s.dayOfWeek]!],
            });
        }
    }

    const courseMap = new Map(dbCourses.map((c) => [c.courseCode.toLowerCase(), c.id]));
    const roomMap = new Map(dbRooms.map((r) => [r.name.toLowerCase(), r.id]));

    // Validate records
    const verifiedEntries: {
        courseId: number;
        roomId: number;
        slotDef: SlotDefinition;
        raw: any;
    }[] = [];

    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const rowNum = i + 2; // header is 1
        const cCode = r.CourseCode?.toLowerCase();
        const rName = r.RoomName?.toLowerCase();
        const sName = r.SlotName;

        if (!cCode || !rName || !sName) {
            errors.push(`Row ${rowNum}: Missing columns (CourseCode, RoomName, SlotName)`);
            continue;
        }

        const courseId = courseMap.get(cCode);
        const roomId = roomMap.get(rName);
        const slotDef = slotMap.get(sName);

        if (!courseId) errors.push(`Row ${rowNum}: Course missing for code '${r.CourseCode}'`);
        if (!roomId) errors.push(`Row ${rowNum}: Room missing for name '${r.RoomName}'`);
        if (!slotDef) errors.push(`Row ${rowNum}: Unknown slot name '${sName}'`);

        if (courseId && roomId && slotDef) {
            verifiedEntries.push({ courseId, roomId, slotDef, raw: r });
        }
    }

    if (errors.length > 0) {
        throw new ValidationError("Timetable validation failed:\n" + errors.join("\n"));
    }

    // Convert + Inject
    let successCount = 0;
    const injectionErrors: string[] = [];

    for (const entry of verifiedEntries) {
        const intervals = convertSlotToDatetimes(
            entry.slotDef,
            semesterStart,
            semesterEnd,
            holidays
        );

        for (const interval of intervals) {
            try {
                await createDirectBooking(actingAdmin, {
                    roomId: entry.roomId,
                    startAt: interval.startAt,
                    endAt: interval.endAt,
                    courseId: entry.courseId,
                });
                successCount++;
            } catch (err: any) {
                // Collect but keep going optionally, or fail entirely.
                // We'll collect and show in final response.
                const msg = err.message || "Unknown error";
                const dateStr = interval.startAt.toISOString().split("T")[0];
                injectionErrors.push(`Failed to book ${entry.raw.CourseCode} in ${entry.raw.RoomName} on ${dateStr}: ${msg}`);
            }
        }
    }

    return {
        message: "Timetable prebooking complete",
        successCount,
        injectionErrors,
    };
}

export async function listSlotSystems() {
    return db.select().from(slotSystems);
}

export async function createSlotSystem(name: string) {
    try {
        const result = await db.insert(slotSystems).values({ name }).returning();
        return result[0];
    } catch (error: any) {
        if (error?.code === "23505") throw new ConflictError("DUP_SYSTEM", "Slot system already exists");
        throw error;
    }
}

export async function addSlotToSystem(
    systemId: number,
    slotParams: { name: string; dayOfWeek: number; startTime: string; endTime: string }
) {
    try {
        const result = await db.insert(slots).values({
            slotSystemId: systemId,
            name: slotParams.name,
            dayOfWeek: slotParams.dayOfWeek,
            startTime: slotParams.startTime,
            endTime: slotParams.endTime,
        }).returning();
        return result[0];
    } catch (error: any) {
        if (error?.code === "23505") throw new ConflictError("DUP_SLOT", "Slot name already exists in this system");
        throw error;
    }
}
