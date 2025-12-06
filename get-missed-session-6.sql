SELECT s.id, COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS name, s.phone, s.username FROM students s LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id = 6 WHERE a.id IS NULL;

