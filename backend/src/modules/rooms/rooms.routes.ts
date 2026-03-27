import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as service from "./rooms.service";

const router = Router();

// GET /rooms/:id/availability
router.get("/:id/availability", authMiddleware, async (req: Request, res: Response, next) => {
    try {
        const roomId = Number(req.params.id);
        if (!Number.isInteger(roomId) || roomId <= 0) {
            return res.status(400).json({ message: "Invalid roomId" });
        }
        const startAtRaw = req.query.startAt;
        const endAtRaw = req.query.endAt;
        if (typeof startAtRaw !== "string" || typeof endAtRaw !== "string") {
            return res.status(400).json({ message: "startAt and endAt are required" });
        }
        const startAt = new Date(startAtRaw);
        const endAt = new Date(endAtRaw);
        if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
            return res.status(400).json({ message: "Invalid startAt or endAt" });
        }
        const result = await service.getRoomAvailability(roomId, startAt, endAt);
        res.json(result);
    } catch (e) { next(e); }
});

// GET /rooms/:id/unavailability
router.get("/:id/unavailability", authMiddleware, async (req, res, next) => {
    try {
        const roomId = Number(req.params.id);
        if (isNaN(roomId)) return res.status(400).json({ error: "Invalid room id" });
        const result = await service.listUnavailability(roomId);
        res.json(result);
    } catch (e) { next(e); }
});

// POST /rooms/:id/unavailability
router.post("/:id/unavailability", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const roomId = Number(req.params.id);
        if (isNaN(roomId)) return res.status(400).json({ error: "Invalid room id" });

        const { startAt, endAt, reason } = req.body ?? {};
        if (!startAt || !endAt || !reason?.trim()) {
            return res.status(400).json({ error: "startAt, endAt, and reason are required" });
        }
        const start = new Date(startAt);
        const end = new Date(endAt);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
            return res.status(400).json({ error: "Invalid date range" });
        }

        const result = await service.createUnavailability(req.user!, roomId, {
            startAt: start,
            endAt: end,
            reason: reason.trim()
        });
        res.status(201).json(result);
    } catch (e) { next(e); }
});

// DELETE /rooms/unavailability/:id
router.delete("/unavailability/:id", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        await service.removeUnavailability(req.user!, id);
        res.json({ message: "Unavailability deleted" });
    } catch (e) { next(e); }
});

// GET /rooms/:id
router.get("/:id", authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid room id" });
        const room = await service.getRoom(id);
        res.json(room);
    } catch (e) { next(e); }
});

// GET /rooms
router.get("/", authMiddleware, async (req, res, next) => {
    try {
        const buildingId = req.query.buildingId !== undefined
            ? Number(req.query.buildingId)
            : undefined;
        if (buildingId !== undefined && isNaN(buildingId)) {
            return res.status(400).json({ error: "Invalid buildingId" });
        }
        const result = await service.listRooms(buildingId);
        res.json(result);
    } catch (e) { next(e); }
});

// POST /rooms
router.post("/", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const name = req.body?.name?.trim();
        const buildingId = req.body?.buildingId !== undefined ? Number(req.body.buildingId) : undefined;
        const capacity = req.body?.capacity !== undefined ? Number(req.body.capacity) : undefined;
        const equipment = req.body?.equipment;

        if (!name) return res.status(400).json({ error: "Name is required" });
        if (buildingId === undefined) return res.status(400).json({ error: "buildingId is required" });
        if (isNaN(buildingId)) return res.status(400).json({ error: "Invalid buildingId" });

        const room = await service.createRoom({ name, buildingId, capacity, equipment });
        res.json(room);
    } catch (e) { next(e); }
});

// PATCH /rooms/:id
router.patch("/:id", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid room id" });

        const name = req.body?.name?.trim();
        const capacity = req.body?.capacity !== undefined ? Number(req.body.capacity) : undefined;
        const equipment = req.body?.equipment;

        const data = await service.updateRoom(id, { name, capacity, equipment });
        res.json({ message: "Room updated", data });
    } catch (e) { next(e); }
});

// DELETE /rooms/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid room id" });
        await service.deleteRoom(id);
        res.json({ message: "Room deleted" });
    } catch (e) { next(e); }
});

export default router;
