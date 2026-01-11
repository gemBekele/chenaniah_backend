-- Migration: Add Resource Model
-- This migration adds support for storing resources (files and links) in the database

-- Create resources table
CREATE TABLE IF NOT EXISTS "resources" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_resources_type" ON "resources"("type");
CREATE INDEX IF NOT EXISTS "idx_resources_created_at" ON "resources"("created_at");
CREATE INDEX IF NOT EXISTS "idx_resources_batch_id" ON "resources"("batch_id");









