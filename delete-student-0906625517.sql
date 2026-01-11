BEGIN;

-- Delete attendance records (must be deleted before student due to RESTRICT constraint)
DELETE FROM attendance 
WHERE student_id IN (SELECT id FROM students WHERE phone = '0906625517');

-- Delete assignment submissions
DELETE FROM assignment_submissions 
WHERE student_id IN (SELECT id FROM students WHERE phone = '0906625517');

-- Delete payments
DELETE FROM payments 
WHERE student_id IN (SELECT id FROM students WHERE phone = '0906625517');

-- Delete interview evaluations
DELETE FROM interview_evaluations 
WHERE appointment_id IN (SELECT id FROM appointments WHERE applicant_phone = '0906625517');

-- Delete students
DELETE FROM students WHERE phone = '0906625517';

-- Delete appointments
DELETE FROM appointments WHERE applicant_phone = '0906625517';

COMMIT;

