-- Room unavailability table
CREATE TABLE IF NOT EXISTS "room_unavailability" (
  "id" serial PRIMARY KEY NOT NULL,
  "room_id" integer NOT NULL REFERENCES "rooms"("id"),
  "start_at" timestamp NOT NULL,
  "end_at" timestamp NOT NULL,
  "reason" text NOT NULL
);
