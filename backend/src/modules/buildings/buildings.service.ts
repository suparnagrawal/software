import * as queries from "./buildings.queries";
import { NotFoundError, ConflictError, ValidationError } from "../../lib/errors";

export async function listBuildings() {
    return queries.getAllBuildings();
}

export async function getBuilding(id: number) {
    const building = await queries.getBuildingById(id);
    if (!building) throw new NotFoundError("Building");
    return building;
}

export async function getRoomsForBuilding(buildingId: number) {
    const building = await queries.getBuildingById(buildingId);
    if (!building) throw new NotFoundError("Building");
    return queries.getRoomsByBuildingId(buildingId);
}

export async function createBuilding(name: string) {
    if (!name) throw new ValidationError("Name is required");
    return queries.insertBuilding(name);
}

export async function updateBuilding(id: number, name: string) {
    if (!name) throw new ValidationError("Name is required");
    const result = await queries.updateBuilding(id, name);
    if (!result) throw new NotFoundError("Building");
    return result;
}

export async function deleteBuilding(id: number) {
    const result = await queries.deleteBuilding(id);
    if (!result) throw new NotFoundError("Building");
    return result;
}
