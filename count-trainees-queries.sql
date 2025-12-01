-- ============================================
-- TRAINEE COUNT QUERIES FOR PRODUCTION
-- ============================================

-- 1. Total count of all trainees
SELECT COUNT(*) AS total_trainees FROM students;

-- 2. Count by status
SELECT 
    status,
    COUNT(*) AS count
FROM students
GROUP BY status
ORDER BY count DESC;

-- 3. Count active trainees only
SELECT COUNT(*) AS active_trainees 
FROM students 
WHERE status = 'active';

-- 4. Count with profile completion status
SELECT 
    profile_complete,
    COUNT(*) AS count
FROM students
GROUP BY profile_complete;

-- 5. Detailed breakdown with status and profile completion
SELECT 
    status,
    profile_complete,
    COUNT(*) AS count
FROM students
GROUP BY status, profile_complete
ORDER BY status, profile_complete;

-- 6. Count by gender (if available)
SELECT 
    gender,
    COUNT(*) AS count
FROM students
WHERE gender IS NOT NULL
GROUP BY gender;

-- 7. Count trainees created in the last 30 days
SELECT COUNT(*) AS trainees_last_30_days
FROM students
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 8. Count trainees created by month (last 6 months)
SELECT 
    TO_CHAR(created_at, 'YYYY-MM') AS month,
    COUNT(*) AS count
FROM students
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY month DESC;

-- 9. Total count with breakdown (comprehensive)
SELECT 
    COUNT(*) AS total_trainees,
    COUNT(*) FILTER (WHERE status = 'active') AS active_trainees,
    COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_trainees,
    COUNT(*) FILTER (WHERE status = 'graduated') AS graduated_trainees,
    COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed_trainees,
    COUNT(*) FILTER (WHERE profile_complete = true) AS profile_complete,
    COUNT(*) FILTER (WHERE profile_complete = false) AS profile_incomplete
FROM students;

-- 10. Count trainees with appointments
SELECT 
    COUNT(*) AS trainees_with_appointments
FROM students
WHERE appointment_id IS NOT NULL;

-- 11. Count trainees without appointments
SELECT 
    COUNT(*) AS trainees_without_appointments
FROM students
WHERE appointment_id IS NULL;



