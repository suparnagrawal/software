import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const backendEnvPath = path.resolve(__dirname, "../../.env");
const rootEnvPath = path.resolve(__dirname, "../../../.env");

let loadedPath = "";

if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath, override: true });
    loadedPath = backendEnvPath;
} else if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: true });
    loadedPath = rootEnvPath;
} else {
    dotenv.config({ override: true });
    loadedPath = "default .env";
}

console.log(`✅ Loaded env from: ${loadedPath}`);
console.log(`📦 DATABASE_URL: ${process.env.DATABASE_URL}`);

// Validate required vars
const requiredEnvs = ["DATABASE_URL", "JWT_SECRET"];
const missingEnvs = requiredEnvs.filter((key) => !process.env[key]);

if (missingEnvs.length > 0) {
    console.error(
        `[Startup Error] Missing required env vars:\n- ${missingEnvs.join("\n- ")}`
    );
    process.exit(1);
}

// Validate DATABASE_URL format
if (!process.env.DATABASE_URL?.includes("@") || !process.env.DATABASE_URL?.includes(":")) {
    console.error("❌ Invalid DATABASE_URL: must include username and password");
    process.exit(1);
}
