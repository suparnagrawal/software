// Timetable Module — Layer 2 (Phase 2)
// This file is a shell ready for Phase 2 implementation.
// The slotConverter converts slot labels to datetime intervals.
// It is the ONLY file in the codebase that knows about slots.

export interface SlotDefinition {
    startTime: string; // "HH:MM" format
    endTime: string;   // "HH:MM" format
    daysOfWeek: string[]; // ["Monday", "Wednesday", "Friday"]
}

const DAY_MAP: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
};

export function convertSlotToDatetimes(
    slot: SlotDefinition,
    semesterStart: Date,
    semesterEnd: Date,
    holidays: Date[]
): Array<{ startAt: Date; endAt: Date }> {
    const results: Array<{ startAt: Date; endAt: Date }> = [];

    const targetDays = slot.daysOfWeek
        .map((d) => DAY_MAP[d])
        .filter((d): d is number => d !== undefined);

    const holidaySet = new Set(
        holidays.map((h) => h.toISOString().split("T")[0])
    );

    const [startHour, startMin] = slot.startTime.split(":").map(Number);
    const [endHour, endMin] = slot.endTime.split(":").map(Number);

    const current = new Date(semesterStart);
    current.setHours(0, 0, 0, 0);

    while (current <= semesterEnd) {
        if (targetDays.includes(current.getDay())) {
            const dateStr = current.toISOString().split("T")[0]!;
            if (!holidaySet.has(dateStr)) {
                const startAt = new Date(current);
                startAt.setHours(startHour!, startMin!, 0, 0);

                const endAt = new Date(current);
                endAt.setHours(endHour!, endMin!, 0, 0);

                results.push({ startAt, endAt });
            }
        }
        current.setDate(current.getDate() + 1);
    }

    return results;
}
