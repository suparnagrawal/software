CREATE TABLE IF NOT EXISTS "slot_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "slot_systems_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_system_id" integer NOT NULL,
	"name" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "slots" ADD CONSTRAINT "slots_slot_system_id_slot_systems_id_fk" FOREIGN KEY ("slot_system_id") REFERENCES "public"."slot_systems"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "slots_system_name_unique" ON "slots" USING btree ("slot_system_id","name");
