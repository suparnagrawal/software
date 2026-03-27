import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as service from "./timetable.service";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /timetable/upload
router.post(
    "/upload",
    authMiddleware,
    requireRole("ADMIN"),
    upload.single("file"),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }

            const slotSystemId = Number(req.body.slotSystemId);
            if (isNaN(slotSystemId)) {
                return res.status(400).json({ error: "Invalid slotSystemId" });
            }

            const semesterStart = req.body.semesterStart;
            const semesterEnd = req.body.semesterEnd;
            if (!semesterStart || !semesterEnd) {
                return res.status(400).json({ error: "semesterStart and semesterEnd are required" });
            }

            const holidays = req.body.holidays
                ? String(req.body.holidays)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [];

            const result = await service.parseAndPrebookTimetable(
                req.file.buffer,
                {
                    slotSystemId,
                    semesterStart: new Date(semesterStart),
                    semesterEnd: new Date(semesterEnd),
                    holidays: holidays.map((d) => new Date(d)),
                },
                req.user!
            );

            res.status(200).json(result);
        } catch (e) {
            next(e);
        }
    }
);

// GET /timetable/systems
router.get("/systems", authMiddleware, async (req, res, next) => {
    try {
        const result = await service.listSlotSystems();
        res.json(result);
    } catch (e) {
        next(e);
    }
});

// POST /timetable/systems
router.post("/systems", authMiddleware, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const name = req.body?.name?.trim();
        if (!name) return res.status(400).json({ error: "Name is required" });
        const result = await service.createSlotSystem(name);
        res.status(201).json(result);
    } catch (e) {
        next(e);
    }
});

// POST /timetable/systems/:id/slots
router.post("/systems/:id/slots", authMiddleware, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const systemId = Number(req.params.id);
        if (isNaN(systemId)) return res.status(400).json({ error: "Invalid system id" });

        const { name, dayOfWeek, startTime, endTime } = req.body ?? {};
        if (!name || dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ error: "Missing required slot fields" });
        }

        const result = await service.addSlotToSystem(systemId, {
            name: name.trim(),
            dayOfWeek: Number(dayOfWeek),
            startTime,
            endTime,
        });
        res.status(201).json(result);
    } catch (e) {
        next(e);
    }
});

export default router;
