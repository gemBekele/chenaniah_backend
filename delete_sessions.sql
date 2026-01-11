-- Delete sessions 1, 2, 3, 4, 5
-- This script handles all foreign key constraints

-- First, let's see what we're about to delete
SELECT 'Sessions to be deleted' as type, id, name, date, location, status
FROM sessions 
WHERE id IN (1, 2, 3, 4, 5);

-- Check related records
SELECT 'Related Attendance Records' as type, COUNT(*) as count
FROM attendance
WHERE session_id IN (1, 2, 3, 4, 5);

SELECT 'Related Notes' as type, COUNT(*) as count
FROM notes
WHERE session_id IN (1, 2, 3, 4, 5);

SELECT 'Related Assignments' as type, COUNT(*) as count
FROM assignments
WHERE session_id IN (1, 2, 3, 4, 5);

SELECT 'Related Assignment Submissions' as type, COUNT(*) as count
FROM assignment_submissions
WHERE assignment_id IN (
  SELECT id FROM assignments WHERE session_id IN (1, 2, 3, 4, 5)
);

-- ============================================
-- ACTUAL DELETION QUERIES (Run after verification)
-- ============================================

BEGIN;

-- 1. Delete assignment submissions for assignments linked to these sessions
DELETE FROM assignment_submissions 
WHERE assignment_id IN (
  SELECT id FROM assignments WHERE session_id IN (1, 2, 3, 4, 5)
);

-- 2. Delete assignments linked to these sessions
DELETE FROM assignments 
WHERE session_id IN (1, 2, 3, 4, 5);

-- 3. Delete attendance records for these sessions
DELETE FROM attendance 
WHERE session_id IN (1, 2, 3, 4, 5);

-- 4. Delete notes for these sessions
DELETE FROM notes 
WHERE session_id IN (1, 2, 3, 4, 5);

-- 5. Delete sessions
DELETE FROM sessions 
WHERE id IN (1, 2, 3, 4, 5);

COMMIT;

-- Verification after deletion
SELECT 'Remaining sessions count' as type, COUNT(*) as count
FROM sessions 
WHERE id IN (1, 2, 3, 4, 5);









