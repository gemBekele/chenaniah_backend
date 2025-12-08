-- Query to check student with username "Mercy_kefetew" (case-insensitive)
-- This will show the actual username and phone number stored in the database

-- Case-insensitive search for the username with phone analysis
SELECT 
    id,
    username,
    phone,
    full_name_english,
    full_name_amharic,
    status,
    created_at,
    regexp_replace(phone, '[^0-9]', '', 'g') AS phone_digits,
    right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) AS last_8_digits
FROM students
WHERE lower(username) = lower('Mercy_kefetew');

-- Check if there are any similar usernames (in case of typos)
SELECT 
    id,
    username,
    phone,
    LOWER(username) AS username_lowercase
FROM students
WHERE LOWER(username) LIKE LOWER('%mercy%kefetew%')
   OR LOWER(username) LIKE LOWER('%mercy_kefetew%')
ORDER BY username;

-- Check phone number variations for the provided phone "0968143309"
SELECT 
    id,
    username,
    phone,
    REGEXP_REPLACE(phone, '[^0-9]', '', 'g') AS phone_digits_only,
    RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 8) AS last_8_digits
FROM students
WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 8) = RIGHT(REGEXP_REPLACE('0968143309', '[^0-9]', '', 'g'), 8);

