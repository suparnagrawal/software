import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as service from "./bookingRequest.service";

const router = Router();

// GET /booking-requests/:id
router.get("/:id", authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const result = await service.getRequest(id, req.user!);
        res.json(result);
    } catch (e) { next(e); }
});

// GET /booking-requests
router.get("/", authMiddleware, async (req, res, next) => {
    try {
        const result = await service.listRequests(req.user!, {
            status: req.query.status as string | undefined,
        });
        res.json(result);
    } catch (e) { next(e); }
});

// POST /booking-requests
router.post("/", authMiddleware, requireRole(["STUDENT", "FACULTY"]), async (req, res, next) => {
    try {
        const result = await service.createBookingRequest(req.user!, {
            roomId: req.body?.roomId,
            startAt: req.body?.startAt,
            endAt: req.body?.endAt,
            purpose: req.body?.purpose,
            courseId: req.body?.courseId ?? null,
            studentCount: req.body?.studentCount ?? null,
            requiredEquipment: req.body?.requiredEquipment ?? null,
            type: req.body?.type ?? "NEW_BOOKING",
            originalBookingId: req.body?.originalBookingId ?? null,
        });
        res.status(201).json(result);
    } catch (e) { next(e); }
});

// POST /booking-requests/:id/forward
router.post("/:id/forward", authMiddleware, requireRole("FACULTY"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const result = await service.forwardRequest(id, req.user!);
        res.json(result);
    } catch (e) { next(e); }
});

// POST /booking-requests/:id/reject
router.post("/:id/reject", authMiddleware, requireRole(["FACULTY", "STAFF"]), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const result = await service.rejectRequest(id, req.user!);
        res.json(result);
    } catch (e) { next(e); }
});

// POST /booking-requests/:id/approve
router.post("/:id/approve", authMiddleware, requireRole("STAFF"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const result = await service.approveRequest(id, req.user!);
        res.json(result);
    } catch (e) { next(e); }
});

// POST /booking-requests/:id/cancel
router.post("/:id/cancel", authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "Invalid request id" });
        }
        const result = await service.cancelRequest(id, req.user!);
        res.json(result);
    } catch (e) { next(e); }
});

export default router;
