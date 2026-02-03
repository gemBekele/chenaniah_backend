-- Student Attendance Summary CSV
-- This query generates a CSV with total student attendance details
-- Includes: Name, Phone, Number of Absence, Days of Absence

\copy (
    SELECT 
        COALESCE(s.full_name_english, s.full_name_amharic, s.username) AS name,
        s.phone,
        (SELECT COUNT(*) FROM sessions WHERE id IN (6,7,8,9,10)) - COUNT(a.id) AS absence_count,
        COALESCE(
            (SELECT STRING_AGG(sess.name, ', ') 
             FROM sessions sess 
             WHERE sess.id IN (6,7,8,9,10) 
             AND sess.id NOT IN (
                 SELECT att.session_id 
                 FROM attendance att 
                 WHERE att.student_id = s.id
             )
            ), 
            'None'
        ) AS missed_sessions,
        COALESCE(
            (SELECT STRING_AGG(TO_CHAR(sess.date, 'Mon DD, YYYY'), ', ') 
             FROM sessions sess 
             WHERE sess.id IN (6,7,8,9,10) 
             AND sess.id NOT IN (
                 SELECT att.session_id 
                 FROM attendance att 
                 WHERE att.student_id = s.id
             )
            ), 
            'None'
        ) AS missed_dates
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id IN (6,7,8,9,10)
    WHERE s.status = 'active'
    GROUP BY s.id, s.full_name_english, s.full_name_amharic, s.username, s.phone
    ORDER BY name
) TO 'student_attendance_summary.csv' WITH CSV HEADER;
