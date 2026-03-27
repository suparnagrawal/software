import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import * as service from "./notifications.service";

const router = Router();

// GET /notifications — own notifications
router.get("/", authMiddleware, async (req, res, next) => {
    try {
        const result = await service.listNotifications(req.user!.id);
        res.json(result);
    } catch (e) { next(e); }
});

// POST /notifications/:id/read — mark as read
router.post("/:id/read", authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const result = await service.markNotificationRead(id, req.user!.id);
        res.json(result);
    } catch (e) { next(e); }
});

export default router;
