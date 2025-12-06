\copy (SELECT COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS name, s.phone FROM attendance a INNER JOIN students s ON a.student_id = s.id WHERE a.session_id = 6 ORDER BY a.scanned_at DESC) TO 'session_6_attendees.csv' WITH CSV HEADER;

