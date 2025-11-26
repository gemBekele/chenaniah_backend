-- CreateTable
CREATE TABLE "users" (
    "user_id" INTEGER NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "name" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "church" TEXT,
    "audio_file_id" TEXT,
    "audio_drive_link" TEXT,
    "audio_file_path" TEXT,
    "file_size" INTEGER,
    "audio_duration" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "last_submission_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "church" TEXT NOT NULL,
    "telegram_username" TEXT,
    "audio_file_path" TEXT NOT NULL,
    "audio_file_size" INTEGER,
    "audio_duration" DOUBLE PRECISION,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewer_comments" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "user_id" INTEGER NOT NULL,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" SERIAL NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "period" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "applicant_name" TEXT NOT NULL,
    "applicant_email" TEXT NOT NULL,
    "applicant_phone" TEXT NOT NULL,
    "scheduled_date" TEXT NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "selected_song" TEXT,
    "additional_song" TEXT,
    "additional_song_singer" TEXT,
    "coordinator_verified" BOOLEAN NOT NULL DEFAULT false,
    "coordinator_verified_at" TIMESTAMP(3),
    "coordinator_approved" BOOLEAN NOT NULL DEFAULT false,
    "coordinator_approved_at" TIMESTAMP(3),
    "final_decision" TEXT,
    "decision_made_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_evaluations" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "judge_name" TEXT NOT NULL,
    "criteria_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_submissions_status" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "idx_submissions_user_id" ON "submissions"("user_id");

-- CreateIndex
CREATE INDEX "idx_submissions_submitted_at" ON "submissions"("submitted_at");

-- CreateIndex
CREATE INDEX "idx_time_slots_date" ON "time_slots"("date");

-- CreateIndex
CREATE INDEX "idx_time_slots_available" ON "time_slots"("available");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_time_date_key" ON "time_slots"("time", "date");

-- CreateIndex
CREATE INDEX "idx_appointments_status" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "idx_appointments_date" ON "appointments"("scheduled_date");

-- CreateIndex
CREATE INDEX "idx_appointments_coordinator_verified" ON "appointments"("coordinator_verified");

-- CreateIndex
CREATE INDEX "idx_evaluations_appointment_id" ON "interview_evaluations"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_evaluations_judge_name" ON "interview_evaluations"("judge_name");

-- CreateIndex
CREATE UNIQUE INDEX "interview_evaluations_appointment_id_judge_name_criteria_na_key" ON "interview_evaluations"("appointment_id", "judge_name", "criteria_name");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
