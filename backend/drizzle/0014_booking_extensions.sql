-- Add course_id to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "course_id" integer REFERENCES "courses"("id");

-- Add course_id, student_count, required_equipment to booking_requests
ALTER TABLE "booking_requests" ADD COLUMN IF NOT EXISTS "course_id" integer REFERENCES "courses"("id");
ALTER TABLE "booking_requests" ADD COLUMN IF NOT EXISTS "student_count" integer;
ALTER TABLE "booking_requests" ADD COLUMN IF NOT EXISTS "required_equipment" text[];

-- Indexes for audience conflict validation
CREATE INDEX IF NOT EXISTS "idx_bookings_course_time"
  ON "bookings" ("course_id", "start_at", "end_at");

CREATE INDEX IF NOT EXISTS "idx_booking_requests_course_time"
  ON "booking_requests" ("course_id", "start_at", "end_at");
