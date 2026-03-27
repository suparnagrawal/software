import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as service from "./booking.service";

const router = Router();

// GET /bookings/:id
router.get("/:id", authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const booking = await service.getBooking(id);
        res.json(booking);
    } catch (e) { next(e); }
});

// GET /bookings
router.get("/", authMiddleware, async (req, res, next) => {
    try {
        const result = await service.listBookings({
            startAt: req.query.startAt as string | undefined,
            endAt: req.query.endAt as string | undefined,
            roomId: req.query.roomId as string | undefined,
            buildingId: req.query.buildingId as string | undefined,
        });
        res.json(result);
    } catch (e) { next(e); }
});

// POST /bookings — direct booking (ADMIN/STAFF)
router.post("/", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const { roomId, startAt, endAt, courseId } = req.body ?? {};
        if (!roomId || !startAt || !endAt) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const booking = await service.createDirectBooking(req.user!, {
            roomId: Number(roomId),
            startAt,
            endAt,
            courseId: courseId !== undefined ? Number(courseId) : null,
        });
        res.status(201).json(booking);
    } catch (e) { next(e); }
});

// DELETE /bookings/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN", "STAFF"]), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        await service.deleteBooking(id);
        res.status(204).send();
    } catch (e) { next(e); }
});

export default router;
