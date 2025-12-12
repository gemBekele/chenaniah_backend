-- Migrate file_path (TEXT) to file_paths (TEXT[])
-- Step 1: Add new column file_paths as TEXT[]
ALTER TABLE "assignment_submissions" ADD COLUMN IF NOT EXISTS "file_paths" TEXT[];

-- Step 2: Migrate existing data from file_path to file_paths
-- Convert single file_path to array format if it exists
UPDATE "assignment_submissions"
SET "file_paths" = ARRAY["file_path"]
WHERE "file_path" IS NOT NULL AND "file_path" != '';

-- Step 3: Drop the old file_path column
ALTER TABLE "assignment_submissions" DROP COLUMN IF EXISTS "file_path";

