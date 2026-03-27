import * as queries from "./availability.queries";

interface SuggestionParams {
    startAt: Date;
    endAt: Date;
    capacity?: number | undefined;
    equipment?: string[] | undefined;
}

export async function getRoomSuggestions(params: SuggestionParams) {
    const { startAt, endAt, capacity, equipment } = params;

    // 1. Get rooms that are FREE in this time range (no bookings, no unavailability)
    const availableRooms = await queries.getAvailableRooms(startAt, endAt);

    // 2. Apply capacity filter (if provided)
    let filtered = availableRooms;
    if (capacity !== undefined) {
        filtered = filtered.filter((room) => (room.capacity ?? 0) >= capacity);
    }

    // 3. Apply equipment filter (if provided)
    if (equipment && equipment.length > 0) {
        filtered = filtered.filter((room) =>
            equipment.every((req) => (room.equipment ?? []).includes(req))
        );
    }

    return filtered.map((room) => ({
        id: room.id,
        name: room.name,
        buildingId: room.buildingId,
        capacity: room.capacity,
        equipment: room.equipment,
    }));
}
