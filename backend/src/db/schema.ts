import {
  pgTable,
  pgEnum,
  serial,
  text,
  uniqueIndex,
  integer,
  timestamp,
  boolean,
  primaryKey,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ───
export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "STAFF",
  "FACULTY",
  "STUDENT",
]);

export const bookingRequestTypeEnum = pgEnum("booking_request_type", [
  "NEW_BOOKING",
  "SLOT_CHANGE",
  "ROOM_CHANGE"
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING_FACULTY",
  "PENDING_STAFF",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

// ─── Buildings ───
export const buildings = pgTable(
  "buildings",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex("buildings_name_unique").on(
      sql`lower(${table.name})`
    ),
  })
);

// ─── Rooms ───
export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    capacity: integer("capacity").notNull().default(0),
    equipment: text("equipment")
      .array()
      .default(sql`'{}'::text[]`),
  },
  (table) => ({
    roomUniquePerBuilding: uniqueIndex("rooms_building_name_unique").on(
      table.buildingId,
      sql`lower(${table.name})`
    ),
  })
);

// ─── Users ───
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

// ─── Courses ───
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  courseCode: text("course_code").notNull().unique(),
  courseName: text("course_name").notNull(),
});

// ─── Booking Requests ───
export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),

  type: bookingRequestTypeEnum("type").notNull().default("NEW_BOOKING"),

  originalBookingId: integer("original_booking_id").references(
    (): AnyPgColumn => bookings.id,
    { onDelete: "set null" }
  ),

  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),

  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),

  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),

  purpose: text("purpose").notNull(),

  status: bookingStatusEnum("status").notNull().default("PENDING_FACULTY"),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  courseId: integer("course_id").references(() => courses.id),
  studentCount: integer("student_count"),
  requiredEquipment: text("required_equipment").array(),
});

// ─── Bookings (confirmed) ───
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),

  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),

  startAt: timestamp("start_at", { withTimezone: false }).notNull(),
  endAt: timestamp("end_at", { withTimezone: false }).notNull(),

  requestId: integer("request_id").references((): AnyPgColumn => bookingRequests.id, {
    onDelete: "set null",
  }),

  courseId: integer("course_id").references(() => courses.id),
});

// ─── Room Unavailability ───
export const roomUnavailability = pgTable("room_unavailability", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  reason: text("reason").notNull(),
});

// ─── Staff ↔ Buildings (junction) ───
export const staffBuildings = pgTable(
  "staff_buildings",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.buildingId] }),
  })
);

// ─── Notifications ───
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  relatedRequestId: integer("related_request_id").references(
    () => bookingRequests.id
  ),
});

// ─── Timetable Module (Phase 2) ───
export const slotSystems = pgTable("slot_systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const slots = pgTable(
  "slots",
  {
    id: serial("id").primaryKey(),
    slotSystemId: integer("slot_system_id")
      .notNull()
      .references(() => slotSystems.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "M1", "T2"
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
    startTime: text("start_time").notNull(), // e.g., "08:40"
    endTime: text("end_time").notNull(), // e.g., "09:30"
  },
  (table) => ({
    slotUnique: uniqueIndex("slots_system_name_unique").on(
      table.slotSystemId,
      table.name
    ),
  })
);