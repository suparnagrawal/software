import "../config/env";

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";

const { Pool } = pkg;

// Ensure DATABASE_URL explicitly exists
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Please set it in backend/.env.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const db = drizzle(pool);
export { pool }; // Exported mapped pool to allow connection test on startup