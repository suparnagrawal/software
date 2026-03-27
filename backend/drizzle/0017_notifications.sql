-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id"),
  "message" text NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "related_request_id" integer REFERENCES "booking_requests"("id")
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_created"
  ON "notifications" ("user_id", "created_at" DESC);
