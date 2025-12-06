-- Query to export trainees (students) to CSV with name, phone, and church
-- Usage options:
-- 1. Using psql COPY command (recommended for large datasets):
--    \copy (SELECT ...) TO 'trainees.csv' WITH CSV HEADER;
-- 2. Using psql with output redirection:
--    psql -d chenaniah_db -f export-trainees-csv.sql -o trainees.csv
-- 3. Using COPY command (requires superuser):
--    COPY (SELECT ...) TO '/path/to/trainees.csv' WITH CSV HEADER;

-- Option 1: Using COALESCE to prefer English name, fallback to Amharic, then username
SELECT 
    COALESCE(full_name_english, full_name_amharic, username) AS name,
    phone AS phone_number,
    COALESCE(local_church, '') AS church
FROM students
ORDER BY name;

-- Option 2: Include both English and Amharic names separately
-- SELECT 
--     COALESCE(full_name_english, username) AS name_english,
--     full_name_amharic AS name_amharic,
--     phone AS phone_number,
--     COALESCE(local_church, '') AS church
-- FROM students
-- ORDER BY name_english;

-- Option 3: Export with COPY command (run this in psql)
-- \copy (SELECT COALESCE(full_name_english, full_name_amharic, username) AS name, phone AS phone_number, COALESCE(local_church, '') AS church FROM students ORDER BY name) TO 'trainees.csv' WITH CSV HEADER;




