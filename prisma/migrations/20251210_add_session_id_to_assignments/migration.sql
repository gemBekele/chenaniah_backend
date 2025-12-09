-- Add optional session_id column to assignments to match Prisma schema
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "session_id" INTEGER;

-- Add foreign key constraint to sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'assignments_session_id_fkey'
    ) THEN
        ALTER TABLE "assignments"
        ADD CONSTRAINT "assignments_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index to speed up lookups by session
CREATE INDEX IF NOT EXISTS "idx_assignments_session_id" ON "assignments"("session_id");

