-- Count of trainees who uploaded a photo
-- A trainee is considered to have uploaded a photo if photo_path is not NULL

SELECT COUNT(*) AS trainees_with_photo
FROM students
WHERE photo_path IS NOT NULL;

-- Additional breakdown: count with and without photos
SELECT 
    COUNT(*) AS total_trainees,
    COUNT(*) FILTER (WHERE photo_path IS NOT NULL) AS with_photo,
    COUNT(*) FILTER (WHERE photo_path IS NULL) AS without_photo,
    ROUND(100.0 * COUNT(*) FILTER (WHERE photo_path IS NOT NULL) / COUNT(*), 2) AS percentage_with_photo
FROM students;




