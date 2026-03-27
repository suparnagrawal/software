DO $$ BEGIN
 CREATE TYPE "public"."booking_request_type" AS ENUM('NEW_BOOKING', 'SLOT_CHANGE', 'ROOM_CHANGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "booking_requests" ADD COLUMN "type" "public"."booking_request_type" DEFAULT 'NEW_BOOKING' NOT NULL;
ALTER TABLE "booking_requests" ADD COLUMN "original_booking_id" integer;

DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_original_booking_id_bookings_id_fk" FOREIGN KEY ("original_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
