-- Delete students with the following IDs
-- Student IDs: 108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58

-- First, let's see what we're about to delete
SELECT 'Students to be deleted' as type, id, username, phone, full_name_english, appointment_id 
FROM students 
WHERE id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- Check related appointments
SELECT 'Related Appointments' as type, a.id, a.applicant_name, a.applicant_phone, a.scheduled_date, a.final_decision
FROM appointments a
WHERE a.id IN (
  SELECT appointment_id FROM students WHERE id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58)
);

-- ============================================
-- ACTUAL DELETION QUERIES (Run after verification)
-- ============================================

BEGIN;

-- 1. Delete assignment submissions for these students
DELETE FROM assignment_submissions 
WHERE student_id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- 2. Delete payments for these students
DELETE FROM payments 
WHERE student_id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- 3. Delete attendance records for these students
DELETE FROM attendance 
WHERE student_id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- 4. Delete team memberships for these students
DELETE FROM team_memberships 
WHERE student_id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- 5. Delete prayer slots for these students
DELETE FROM prayer_slots 
WHERE claimed_by_id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- 6. Delete notes authored by these students
DELETE FROM notes 
WHERE author_id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- 7. Delete notices for these students
DELETE FROM notices 
WHERE target_student_id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

-- 8. Delete interview evaluations for appointments linked to these students
DELETE FROM interview_evaluations 
WHERE appointment_id IN (
  SELECT appointment_id FROM students WHERE id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58)
);

-- 9. Delete appointments linked to these students
DELETE FROM appointments 
WHERE id IN (
  SELECT appointment_id FROM students WHERE id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58)
);

-- 10. Delete students
DELETE FROM students 
WHERE id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);

COMMIT;

-- Verification after deletion
SELECT 'Remaining students count' as type, COUNT(*) as count
FROM students 
WHERE id IN (108, 161, 48, 72, 6, 93, 109, 150, 137, 141, 129, 58);
