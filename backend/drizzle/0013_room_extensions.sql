-- Add capacity and equipment to rooms
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "capacity" integer NOT NULL DEFAULT 0;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "equipment" text[] DEFAULT '{}'::text[];
