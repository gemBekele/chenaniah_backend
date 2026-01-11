/*
  Warnings:

  - A unique constraint covering the columns `[telegram_chat_id]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "students" ADD COLUMN     "telegram_chat_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "students_telegram_chat_id_key" ON "students"("telegram_chat_id");
