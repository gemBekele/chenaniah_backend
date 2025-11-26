-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name_amharic" TEXT,
    "full_name_english" TEXT,
    "phone" TEXT NOT NULL,
    "profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "id_document_path" TEXT,
    "recommendation_letter_path" TEXT,
    "essay" TEXT,
    "appointment_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "file_path" TEXT,
    "text" TEXT,
    "grade" INTEGER,
    "feedback" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graded_at" TIMESTAMP(3),
    "graded_by" TEXT,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_username_key" ON "students"("username");

-- CreateIndex
CREATE UNIQUE INDEX "students_phone_key" ON "students"("phone");

-- CreateIndex
CREATE INDEX "idx_students_username" ON "students"("username");

-- CreateIndex
CREATE INDEX "idx_students_phone" ON "students"("phone");

-- CreateIndex
CREATE INDEX "idx_students_status" ON "students"("status");

-- CreateIndex
CREATE INDEX "idx_assignments_due_date" ON "assignments"("due_date");

-- CreateIndex
CREATE INDEX "idx_assignment_submissions_student_id" ON "assignment_submissions"("student_id");

-- CreateIndex
CREATE INDEX "idx_assignment_submissions_assignment_id" ON "assignment_submissions"("assignment_id");

-- CreateIndex
CREATE INDEX "idx_assignment_submissions_submitted_at" ON "assignment_submissions"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_student_id_assignment_id_key" ON "assignment_submissions"("student_id", "assignment_id");

-- CreateIndex
CREATE INDEX "idx_payments_student_id" ON "payments"("student_id");

-- CreateIndex
CREATE INDEX "idx_payments_month" ON "payments"("month");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_student_id_month_key" ON "payments"("student_id", "month");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
