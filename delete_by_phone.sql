-- Delete user data by phone number
-- Usage: Replace '+251988887777' with the actual phone number

-- First, let's see what we're about to delete
SELECT 'Students' as type, id, username, phone, appointment_id FROM students WHERE phone = '+251988887777';
SELECT 'Appointments' as type, id, applicant_name, applicant_phone, scheduled_date, final_decision FROM appointments WHERE applicant_phone = '+251988887777';

-- Delete related records first (due to foreign key constraints)

-- 1. Delete assignment submissions for students with this phone
DELETE FROM assignment_submissions 
WHERE student_id IN (SELECT id FROM students WHERE phone = '+251988887777');

-- 2. Delete payments for students with this phone
DELETE FROM payments 
WHERE student_id IN (SELECT id FROM students WHERE phone = '+251988887777');

-- 3. Delete interview evaluations for appointments with this phone
DELETE FROM interview_evaluations 
WHERE appointment_id IN (SELECT id FROM appointments WHERE applicant_phone = '+251988887777');

-- 4. Delete students with this phone
DELETE FROM students WHERE phone = '+251988887777';

-- 5. Delete appointments with this phone
DELETE FROM appointments WHERE applicant_phone = '+251988887777';

-- Optional: Also delete from users and submissions tables if needed
-- DELETE FROM submissions WHERE phone = '+251988887777';
-- DELETE FROM users WHERE phone = '+251988887777';



