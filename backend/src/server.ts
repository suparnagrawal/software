console.log("SERVER STARTING...");
import "./config/env"; // MUST be first — loads process.env before any module

import express from "express";
import authRouter from "./auth/auth.routes";
import buildingsRouter from "./modules/buildings/buildings.routes";
import roomsRouter from "./modules/rooms/rooms.routes";
import bookingsRouter from "./modules/booking/booking.routes";
import bookingRequestsRouter from "./modules/booking-requests/bookingRequest.routes";
import availabilityRouter from "./modules/availability/availability.routes";
import usersRouter from "./modules/users/users.routes";
import notificationsRouter from "./modules/notifications/notifications.routes";
import adminRouter from "./modules/admin/admin.routes";
import { errorHandler } from "./lib/errors";
import { pool } from "./db/index";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// ── Routes (all under /api prefix) ──
app.use("/api/auth", authRouter);
app.use("/api/buildings", buildingsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/booking-requests", bookingRequestsRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/users", usersRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);

// Timetable router — Layer 2 (uncomment in Phase 2)
import timetableRouter from "./modules/timetable/timetable.routes";
app.use("/api/timetable", timetableRouter);

// ── Global Error Handler ──
app.use(errorHandler);

async function startServer() {
  try {
    // ── Startup Validation (STEP 7) ──
    console.log("Testing database connection...");
    const client = await pool.connect();
    client.release();
    console.log("Database connection successful.");
  } catch (err: any) {
    console.error(`[Startup Error] Database connection failed: ${err.message}`);
    console.error("Please verify your DATABASE_URL in backend/.env");
    process.exit(1);
  }

  console.log("About to listen....");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();