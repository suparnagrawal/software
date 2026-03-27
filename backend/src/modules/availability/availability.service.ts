import * as queries from "./availability.queries";

type AvailabilityRoom = {
    id: number;
    name: string;
    isAvailable: boolean;
};

type AvailabilityBuilding = {
    buildingId: number;
    buildingName: string;
    rooms: AvailabilityRoom[];
};

export async function computeAvailability(
    startAt: Date,
    endAt: Date,
    buildingId?: number
): Promise<AvailabilityBuilding[]> {
    const rows = await queries.getAvailabilityData(startAt, endAt, buildingId);

    const grouped = new Map<number, AvailabilityBuilding>();

    for (const row of rows) {
        const room: AvailabilityRoom = {
            id: row.roomId,
            name: row.roomName,
            isAvailable:
                Number(row.bookingCount) === 0 && Number(row.unavailabilityCount) === 0,
        };

        const existing = grouped.get(row.buildingId);

        if (existing) {
            existing.rooms.push(room);
        } else {
            grouped.set(row.buildingId, {
                buildingId: row.buildingId,
                buildingName: row.buildingName,
                rooms: [room],
            });
        }
    }

    return Array.from(grouped.values());
}
