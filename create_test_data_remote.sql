-- Create test user
INSERT INTO users (user_id, username, first_name, last_name, name, phone, address, church, state, created_at, updated_at, submission_count)
VALUES (1013, 'testuser_remote', 'Test', 'User', 'Test User Remote', '+251988887777', 'Test Address, Addis Ababa', 'Test Church', 'idle', NOW(), NOW(), 1)
ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone
RETURNING user_id, phone, name;

-- Create approved submission
INSERT INTO submissions (user_id, name, address, phone, church, telegram_username, audio_file_path, audio_file_size, audio_duration, status, reviewed_by, reviewed_at, reviewer_comments, submitted_at)
VALUES (1013, 'Test User Remote', 'Test Address, Addis Ababa', '+251988887777', 'Test Church', 'testuser_remote', 'test/audio.mp3', 1000000, 120.5, 'approved', 'admin', NOW(), 'Test submission created on remote server', NOW())
RETURNING id, phone, status;

-- Create appointment with accepted status
INSERT INTO appointments (applicant_name, applicant_email, applicant_phone, scheduled_date, scheduled_time, status, selected_song, notes, coordinator_verified, coordinator_approved, final_decision, decision_made_at, created_at, updated_at)
VALUES ('Test User Remote', 'test@example.com', '+251988887777', (SELECT to_char(CURRENT_DATE + INTERVAL '1 day', 'YYYY-MM-DD')), '14:00', 'scheduled', 'Test Song', 'Test appointment created on remote server', false, false, 'accepted', NOW(), NOW(), NOW())
RETURNING id, applicant_name, applicant_phone, scheduled_date, scheduled_time, status, final_decision;



