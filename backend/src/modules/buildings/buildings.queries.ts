import { db } from "../../db";
import { buildings, rooms } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function getAllBuildings() {
    return db.select().from(buildings);
}

export async function getBuildingById(id: number) {
    const rows = await db
        .select()
        .from(buildings)
        .where(eq(buildings.id, id))
        .limit(1);
    return rows[0] ?? null;
}

export async function getRoomsByBuildingId(buildingId: number) {
    return db.select().from(rooms).where(eq(rooms.buildingId, buildingId));
}

export async function insertBuilding(name: string) {
    const result = await db.insert(buildings).values({ name }).returning();
    return result[0]!;
}

export async function updateBuilding(id: number, name: string) {
    const result = await db
        .update(buildings)
        .set({ name })
        .where(eq(buildings.id, id))
        .returning();
    return result[0] ?? null;
}

export async function deleteBuilding(id: number) {
    const result = await db
        .delete(buildings)
        .where(eq(buildings.id, id))
        .returning();
    return result[0] ?? null;
}
