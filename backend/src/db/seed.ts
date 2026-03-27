import "../config/env";

import { db } from "./index";
import { users, courses, buildings, rooms, staffBuildings } from "./schema";
import bcrypt from "bcrypt";

async function seed() {
    try {
        const password = "password123"; // dev only
        const passwordHash = await bcrypt.hash(password, 10);

        const seedData = [
            {
                name: "Admin User",
                email: "admin@ura.com",
                passwordHash,
                role: "ADMIN" as const,
            },
            {
                name: "Staff User",
                email: "staff@ura.com",
                passwordHash,
                role: "STAFF" as const,
            },
            {
                name: "Faculty User",
                email: "faculty@ura.com",
                passwordHash,
                role: "FACULTY" as const,
            },
            {
                name: "Student User",
                email: "student@ura.com",
                passwordHash,
                role: "STUDENT" as const,
            },
        ];

        console.log("Seeding users...");
        const createdUsers = await db.insert(users).values(seedData).returning({ id: users.id, role: users.role }).onConflictDoNothing();

        console.log("Seeding courses...");
        const coursesData = [
            { courseCode: "CS101", courseName: "Introduction to Computer Science" },
            { courseCode: "SE202", courseName: "Software Engineering" },
            { courseCode: "MA303", courseName: "Advanced Calculus" },
        ];
        await db.insert(courses).values(coursesData).onConflictDoNothing();

        console.log("Seeding buildings and rooms...");
        const bldg = await db.insert(buildings).values({ name: "Main Sciences Building" }).returning({ id: buildings.id }).onConflictDoNothing();

        let buildingId: number | undefined;
        if (bldg && bldg[0]) {
            buildingId = bldg[0].id;
        } else {
            // If building exists, try to get it
            const existingBldg = await db.select({ id: buildings.id }).from(buildings).limit(1);
            if (existingBldg.length > 0) buildingId = existingBldg[0]!.id;
        }

        if (buildingId) {
            await db.insert(rooms).values([
                { name: "Room 101", buildingId, capacity: 50, equipment: ["Projector", "Whiteboard"] },
                { name: "Lab 202", buildingId, capacity: 30, equipment: ["Computers", "Projector"] },
            ]).onConflictDoNothing();

            // Assign first staff user to this building
            const staffUser = createdUsers.find(u => u.role === "STAFF");
            if (staffUser) {
                console.log("Assigning staff to building...");
                await db.insert(staffBuildings).values({
                    userId: staffUser.id,
                    buildingId
                }).onConflictDoNothing();
            }
        }

        console.log("\n✅ Seed completed successfully! Default accounts:");
        console.log("-------------------------------------------------");
        console.log("Admin   | admin@ura.com   | password123");
        console.log("Staff   | staff@ura.com   | password123");
        console.log("Faculty | faculty@ura.com | password123");
        console.log("Student | student@ura.com | password123");
        console.log("-------------------------------------------------\n");
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seed();
