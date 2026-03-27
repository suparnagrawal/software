-- Staff-building assignment junction table
CREATE TABLE IF NOT EXISTS "staff_buildings" (
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "building_id" integer NOT NULL REFERENCES "buildings"("id"),
  PRIMARY KEY ("user_id", "building_id")
);
