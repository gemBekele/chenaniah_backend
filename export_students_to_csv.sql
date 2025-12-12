-- Export students full_name_english and phone to CSV
-- Usage: Run this in psql using \copy command (works without superuser)

-- Run this command in psql:
\copy (SELECT full_name_english, phone FROM students ORDER BY full_name_english) TO 'students_export.csv' WITH CSV HEADER

-- Alternative: If you want to see the data first before exporting
-- SELECT full_name_english, phone
-- FROM students
-- ORDER BY full_name_english;

