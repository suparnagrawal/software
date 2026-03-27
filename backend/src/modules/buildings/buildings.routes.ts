import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as service from "./buildings.service";

const router = Router();

// GET /buildings/:id/rooms
router.get("/:id/rooms", authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid building id" });
        const rooms = await service.getRoomsForBuilding(id);
        res.json(rooms);
    } catch (e) { next(e); }
});

// GET /buildings/:id
router.get("/:id", authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid building id" });
        const building = await service.getBuilding(id);
        res.json(building);
    } catch (e) { next(e); }
});

// GET /buildings
router.get("/", authMiddleware, async (req, res, next) => {
    try {
        const data = await service.listBuildings();
        res.json({ data });
    } catch (e) { next(e); }
});

// POST /buildings
router.post("/", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const name = req.body?.name?.trim();
        const data = await service.createBuilding(name);
        res.json({ message: "Building created", data });
    } catch (e) { next(e); }
});

// PATCH /buildings/:id
router.patch("/:id", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid building id" });
        const name = req.body?.name?.trim();
        const data = await service.updateBuilding(id, name);
        res.json({ message: "Building updated", data });
    } catch (e) { next(e); }
});

// DELETE /buildings/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid building id" });
        await service.deleteBuilding(id);
        res.json({ message: "Building deleted" });
    } catch (e) { next(e); }
});

export default router;
