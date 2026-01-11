/*
  Warnings:

  - The primary key for the `rate_limits` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `submissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[qr_code]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_session_id_fkey";

-- DropForeignKey
ALTER TABLE "rate_limits" DROP CONSTRAINT "rate_limits_user_id_fkey";

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_user_id_fkey";

-- AlterTable
ALTER TABLE "notes" ALTER COLUMN "image_path" SET DATA TYPE TEXT,
ALTER COLUMN "type" SET DATA TYPE TEXT,
ALTER COLUMN "author_id" DROP NOT NULL,
ALTER COLUMN "author_type" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prayer_slots" ALTER COLUMN "start_time" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "rate_limits" DROP CONSTRAINT "rate_limits_pkey",
ALTER COLUMN "user_id" SET DATA TYPE BIGINT,
ALTER COLUMN "submission_count" SET DATA TYPE BIGINT,
ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("user_id");

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "section_id" INTEGER,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "section_id" INTEGER;

-- AlterTable
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_pkey",
ALTER COLUMN "id" SET DATA TYPE BIGINT,
ALTER COLUMN "user_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "team_notices" ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "teams" ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "color" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "user_id" SET DATA TYPE BIGINT,
ALTER COLUMN "file_size" SET DATA TYPE BIGINT,
ALTER COLUMN "submission_count" SET DATA TYPE BIGINT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "leader_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sections_name_key" ON "sections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sections_code_key" ON "sections"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sections_leader_id_key" ON "sections"("leader_id");

-- CreateIndex
CREATE INDEX "idx_resources_section_id" ON "resources"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_qr_code_key" ON "students"("qr_code");

-- CreateIndex
CREATE INDEX "idx_students_section_id" ON "students"("section_id");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
