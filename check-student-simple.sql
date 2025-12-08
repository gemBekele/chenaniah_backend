-- Simple query to check student - copy and paste this into psql
SELECT 
    id,
    username,
    phone,
    regexp_replace(phone, '[^0-9]', '', 'g') AS phone_digits,
    right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) AS last_8_digits
FROM students
WHERE lower(username) = lower('Mercy_kefetew');







