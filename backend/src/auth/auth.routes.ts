import { Router } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment");
}

// POST /auth/login
router.post("/login", async (req, res, next) => {
    try {
        const email = req.body?.email?.trim();
        const password = req.body?.password;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const rows = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error: any) {
        // Intercept likely database connection / relation errors specifically for the login route
        // to return unambiguous feedback.
        if (error.code === "ECONNREFUSED" || error.code === "28P01" || error.message.includes("password") || error.message.includes("SASL") || error.message.includes("connection")) {
            return res.status(503).json({ error: "Database connection failed. Please contact your administrator." });
        }
        console.error("[Login Error]", error);
        return res.status(500).json({ error: "Internal server error during authentication" });
    }
});

export default router;
