import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as service from "./users.service";

const router = Router();
router.use(authMiddleware);
router.use(requireRole("ADMIN"));

// GET /users
router.get("/", async (req, res, next) => {
    try {
        const users = await service.listUsers();
        res.json(users);
    } catch (e) { next(e); }
});

// GET /users/:id
router.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const user = await service.getUser(id);
        res.json(user);
    } catch (e) { next(e); }
});

// POST /users
router.post("/", async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body ?? {};
        const user = await service.createUser({ name, email, password, role });
        res.status(201).json(user);
    } catch (e) { next(e); }
});

// PATCH /users/:id
router.patch("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        const { name, email, role } = req.body ?? {};
        const user = await service.updateUser(id, { name, email, role });
        res.json(user);
    } catch (e) { next(e); }
});

// DELETE /users/:id
router.delete("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
        await service.deleteUser(id);
        res.json({ message: "User deleted" });
    } catch (e) { next(e); }
});

export default router;
