-- Add gender and photo_path columns to students table
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photo_path" TEXT;


