-- Export students and their submitted notes count to CSV
-- Usage: Run this in psql using \copy command (works without superuser)
-- 
-- Command to run in psql:
-- \copy (SELECT s.id AS student_id, COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS student_name, s.full_name_english, s.full_name_amharic, s.username, s.phone, COUNT(n.id) AS notes_submitted FROM students s LEFT JOIN notes n ON s.id = n.author_id AND n.author_type = 'student' GROUP BY s.id, s.full_name_english, s.full_name_amharic, s.username, s.phone ORDER BY notes_submitted DESC, student_name) TO 'student_notes_export.csv' WITH CSV HEADER;

-- Query to preview the data before exporting:
SELECT 
    s.id AS student_id,
    COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS student_name,
    s.full_name_english,
    s.full_name_amharic,
    s.username,
    s.phone,
    COUNT(n.id) AS notes_submitted
FROM students s
LEFT JOIN notes n ON s.id = n.author_id AND n.author_type = 'student'
GROUP BY s.id, s.full_name_english, s.full_name_amharic, s.username, s.phone
ORDER BY notes_submitted DESC, student_name;















