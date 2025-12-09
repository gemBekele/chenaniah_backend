BEGIN; DELETE FROM assignment_submissions WHERE student_id IN (SELECT s.id FROM students s LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id = 6 WHERE a.id IS NULL); DELETE FROM payments WHERE student_id IN (SELECT s.id FROM students s LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id = 6 WHERE a.id IS NULL); DELETE FROM attendance WHERE student_id IN (SELECT s.id FROM students s LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id = 6 WHERE a.id IS NULL); DELETE FROM students WHERE id IN (SELECT s.id FROM students s LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id = 6 WHERE a.id IS NULL); COMMIT;



