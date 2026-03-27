-- courses table
CREATE TABLE IF NOT EXISTS "courses" (
  "id" serial PRIMARY KEY NOT NULL,
  "course_code" text NOT NULL UNIQUE,
  "course_name" text NOT NULL
);
