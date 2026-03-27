import "../src/config/env";
import { execSync } from "child_process";
import { pool } from "../src/db/index";
console.log("DATABASE_URL:", process.env.DATABASE_URL);

async function runSetup() {
    console.log("🚀 Starting System Setup...\n");

    try {
        console.log("⏳ 1. Testing Database Connection...");
        const client = await pool.connect();
        client.release();
        console.log("✅ Database configuration valid.");
    } catch (err: any) {
        console.error(`\n❌ Database connection failed: ${err.message}`);
        console.error("Please ensure your PostgreSQL database is running and DATABASE_URL inside backend/.env is correct.");
        process.exit(1);
    }

    try {
        console.log("\n⏳ 2. Running database migrations...");
        execSync("npx drizzle-kit push", { stdio: "inherit", env: process.env });
        console.log("✅ Migrations applied successfully.");
    } catch (err) {
        console.error("\n❌ Failed to run Drizzle migrations.");
        process.exit(1);
    }

    try {
        console.log("\n⏳ 3. Seeding default data...");
        execSync("npx ts-node-dev src/db/seed.ts", { stdio: "inherit", env: process.env });
        // Seed script outputs success directly
    } catch (err) {
        console.error("\n❌ Failed to seed database.");
        process.exit(1);
    }

    console.log("\n🎉 Setup Complete! You can now start the server with:");
    console.log("   npm run dev\n");
    process.exit(0);
}

runSetup();
