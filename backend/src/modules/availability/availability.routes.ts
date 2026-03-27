import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { computeAvailability } from "./availability.service";
import { getRoomSuggestions } from "./suggestions.service";

const router = Router();

function parseDate(value: unknown): Date | null {
    if (typeof value !== "string" || value.trim() === "") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalInt(value: unknown): number | null {
    if (value === undefined) return null;
    if (typeof value !== "string" || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// GET /availability
router.get("/", authMiddleware, async (req: Request, res: Response, next) => {
    try {
        const startAt = parseDate(req.query.startAt);
        const endAt = parseDate(req.query.endAt);
        const buildingId = parseOptionalInt(req.query.buildingId);

        if (!startAt || !endAt || startAt.getTime() >= endAt.getTime()) {
            return res.status(400).json({ message: "Invalid startAt or endAt" });
        }

        if (req.query.buildingId !== undefined && buildingId === null) {
            return res.status(400).json({ message: "Invalid buildingId" });
        }

        const result = await computeAvailability(
            startAt,
            endAt,
            buildingId ?? undefined
        );
        res.json(result);
    } catch (e) { next(e); }
});

// GET /availability/suggestions
router.get("/suggestions", authMiddleware, async (req: Request, res: Response, next) => {
    try {
        const startAt = parseDate(req.query.startAt);
        const endAt = parseDate(req.query.endAt);

        if (!startAt || !endAt || startAt.getTime() >= endAt.getTime()) {
            return res.status(400).json({ message: "Invalid startAt or endAt" });
        }

        const capacity = req.query.capacity ? Number(req.query.capacity) : undefined;
        const equipment = req.query.equipment
            ? (req.query.equipment as string).split(",").map((s) => s.trim()).filter(Boolean)
            : undefined;

        const result = await getRoomSuggestions({
            startAt,
            endAt,
            capacity,
            equipment,
        });

        res.json(result);
    } catch (e) { next(e); }
});

export default router;
