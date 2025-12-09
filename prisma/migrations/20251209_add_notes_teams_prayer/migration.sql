-- Migration: Add Notes, Teams, and Prayer Features
-- This migration adds support for:
-- 1. Notes attached to sessions (text or image)
-- 2. Teams with memberships and team notices
-- 3. Personal notices for specific students
-- 4. Chain Prayer 15-minute time slots

-- Add targetStudentId to notices table for personal notices
ALTER TABLE "notices" ADD COLUMN IF NOT EXISTS "target_student_id" INTEGER;
CREATE INDEX IF NOT EXISTS "idx_notices_target_student" ON "notices"("target_student_id");

-- Create notes table
CREATE TABLE IF NOT EXISTS "notes" (
    "id" SERIAL PRIMARY KEY,
    "content" TEXT,
    "image_path" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "session_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "author_type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_notes_session_id" ON "notes"("session_id");
CREATE INDEX IF NOT EXISTS "idx_notes_author_id" ON "notes"("author_id");

-- Create teams table
CREATE TABLE IF NOT EXISTS "teams" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "description" TEXT,
    "color" VARCHAR(50) NOT NULL DEFAULT '#3B82F6',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create team_memberships table (many-to-many between students and teams)
CREATE TABLE IF NOT EXISTS "team_memberships" (
    "id" SERIAL PRIMARY KEY,
    "team_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "join_reason" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_memberships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_memberships_team_id_student_id_key" UNIQUE ("team_id", "student_id")
);

CREATE INDEX IF NOT EXISTS "idx_team_memberships_team_id" ON "team_memberships"("team_id");
CREATE INDEX IF NOT EXISTS "idx_team_memberships_student_id" ON "team_memberships"("student_id");

-- Create team_notices table
CREATE TABLE IF NOT EXISTS "team_notices" (
    "id" SERIAL PRIMARY KEY,
    "team_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_notices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_team_notices_team_id" ON "team_notices"("team_id");
CREATE INDEX IF NOT EXISTS "idx_team_notices_created_at" ON "team_notices"("created_at");

-- Create prayer_slots table (15-minute intervals throughout the week)
CREATE TABLE IF NOT EXISTS "prayer_slots" (
    "id" SERIAL PRIMARY KEY,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "claimed_by_id" INTEGER,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prayer_slots_claimed_by_id_fkey" FOREIGN KEY ("claimed_by_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "prayer_slots_day_of_week_start_time_key" UNIQUE ("day_of_week", "start_time")
);

CREATE INDEX IF NOT EXISTS "idx_prayer_slots_claimed_by" ON "prayer_slots"("claimed_by_id");

-- Add foreign key for personal notices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notices_target_student_id_fkey'
    ) THEN
        ALTER TABLE "notices" ADD CONSTRAINT "notices_target_student_id_fkey" 
        FOREIGN KEY ("target_student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
