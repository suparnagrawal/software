import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { db } from "../../db";
import { staffBuildings, users } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ValidationError } from "../../lib/errors";

const router = Router();
router.use(authMiddleware);
router.use(requireRole("ADMIN"));

// POST /admin/staff-buildings — assign staff to building
router.post("/staff-buildings", async (req, res, next) => {
    try {
        const { userId, buildingId } = req.body ?? {};
        if (!userId || !buildingId)
            return res.status(400).json({ error: "userId and buildingId are required" });

        // Verify user is STAFF
        const user = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, Number(userId)))
            .limit(1);

        if (!user[0]) throw new NotFoundError("User");
        if (user[0].role !== "STAFF")
            throw new ValidationError("User must have STAFF role");

        const result = await db
            .insert(staffBuildings)
            .values({ userId: Number(userId), buildingId: Number(buildingId) })
            .returning();

        res.status(201).json(result[0]);
    } catch (e) { next(e); }
});

// DELETE /admin/staff-buildings/:userId/:buildingId
router.delete("/staff-buildings/:userId/:buildingId", async (req, res, next) => {
    try {
        const userId = Number(req.params.userId);
        const buildingId = Number(req.params.buildingId);
        if (isNaN(userId) || isNaN(buildingId))
            return res.status(400).json({ error: "Invalid userId or buildingId" });

        const result = await db
            .delete(staffBuildings)
            .where(
                and(
                    eq(staffBuildings.userId, userId),
                    eq(staffBuildings.buildingId, buildingId)
                )
            )
            .returning();

        if (result.length === 0) throw new NotFoundError("Staff-building assignment");

        res.json({ message: "Assignment removed" });
    } catch (e) { next(e); }
});

// GET /admin/staff-buildings/:userId
router.get("/staff-buildings/:userId", async (req, res, next) => {
    try {
        const userId = Number(req.params.userId);
        if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });

        const result = await db
            .select()
            .from(staffBuildings)
            .where(eq(staffBuildings.userId, userId));

        res.json(result);
    } catch (e) { next(e); }
});

export default router;
