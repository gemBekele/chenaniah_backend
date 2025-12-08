-- AlterTable: Add qr_code column to students
ALTER TABLE "students" ADD COLUMN "qr_code" TEXT;

-- CreateIndex: Add unique index for qr_code
CREATE UNIQUE INDEX "idx_students_qr_code" ON "students"("qr_code") WHERE "qr_code" IS NOT NULL;

-- CreateTable: Sessions
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "facilitator_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Attendance
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),
    "is_offline" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Sessions indexes
CREATE INDEX "idx_sessions_date" ON "sessions"("date");
CREATE INDEX "idx_sessions_status" ON "sessions"("status");

-- CreateIndex: Attendance indexes
CREATE UNIQUE INDEX "attendance_session_id_student_id_key" ON "attendance"("session_id", "student_id");
CREATE INDEX "idx_attendance_session_id" ON "attendance"("session_id");
CREATE INDEX "idx_attendance_student_id" ON "attendance"("student_id");
CREATE INDEX "idx_attendance_scanned_at" ON "attendance"("scanned_at");
CREATE INDEX "idx_attendance_is_offline" ON "attendance"("is_offline");

-- AddForeignKey: Attendance to Session
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Attendance to Student
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

