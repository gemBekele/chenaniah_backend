-- Export students and their team memberships to CSV
-- Usage: Run this in psql using \copy command (works without superuser)
-- 
-- Command to run in psql:
-- \copy (SELECT s.id AS student_id, COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS student_name, s.full_name_english, s.full_name_amharic, s.username, s.phone, t.id AS team_id, t.name AS team_name, t.description AS team_description, t.color AS team_color, tm.join_reason, tm.joined_at FROM students s INNER JOIN team_memberships tm ON s.id = tm.student_id INNER JOIN teams t ON tm.team_id = t.id ORDER BY student_name, team_name) TO 'student_teams_export.csv' WITH CSV HEADER;

-- Query to preview the data before exporting:
SELECT 
    s.id AS student_id,
    COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS student_name,
    s.full_name_english,
    s.full_name_amharic,
    s.username,
    s.phone,
    t.id AS team_id,
    t.name AS team_name,
    t.description AS team_description,
    t.color AS team_color,
    tm.join_reason,
    tm.joined_at
FROM students s
INNER JOIN team_memberships tm ON s.id = tm.student_id
INNER JOIN teams t ON tm.team_id = t.id
ORDER BY student_name, team_name;

-- Alternative: Summary query showing student with count of teams joined
-- \copy (SELECT s.id AS student_id, COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS student_name, s.full_name_english, s.full_name_amharic, s.username, s.phone, COUNT(tm.id) AS teams_joined, STRING_AGG(t.name, ', ' ORDER BY t.name) AS team_names FROM students s LEFT JOIN team_memberships tm ON s.id = tm.student_id LEFT JOIN teams t ON tm.team_id = t.id GROUP BY s.id, s.full_name_english, s.full_name_amharic, s.username, s.phone ORDER BY teams_joined DESC, student_name) TO 'student_teams_summary.csv' WITH CSV HEADER;












