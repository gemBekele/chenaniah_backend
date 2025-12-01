#!/bin/bash

# Script to delete student and appointment records by phone number
# Usage: ./delete_by_phone.sh +251988887777

if [ -z "$1" ]; then
    echo "Usage: $0 <phone_number>"
    echo "Example: $0 +251988887777"
    exit 1
fi

PHONE="$1"
DB_USER="${DB_USER:-chenaniah}"
DB_PASS="${DB_PASS:-30433043}"
DB_NAME="chenaniah_db"

echo "Deleting records for phone: $PHONE"
echo ""

# Show what will be deleted
echo "=== Records to be deleted ==="
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 'Students' as type, id, username, phone, appointment_id 
FROM students 
WHERE phone = '$PHONE'
UNION ALL
SELECT 'Appointments' as type, id::text, applicant_name, applicant_phone, scheduled_date::text
FROM appointments 
WHERE applicant_phone = '$PHONE';
"

echo ""
read -p "Are you sure you want to delete these records? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deletion cancelled."
    exit 0
fi

echo ""
echo "Deleting records..."

# Delete in correct order to handle foreign keys
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<EOF
BEGIN;

-- Delete assignment submissions
DELETE FROM assignment_submissions 
WHERE student_id IN (SELECT id FROM students WHERE phone = '$PHONE');

-- Delete payments
DELETE FROM payments 
WHERE student_id IN (SELECT id FROM students WHERE phone = '$PHONE');

-- Delete interview evaluations
DELETE FROM interview_evaluations 
WHERE appointment_id IN (SELECT id FROM appointments WHERE applicant_phone = '$PHONE');

-- Delete students
DELETE FROM students WHERE phone = '$PHONE';

-- Delete appointments
DELETE FROM appointments WHERE applicant_phone = '$PHONE';

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Successfully deleted all records for phone: $PHONE"
else
    echo "❌ Error deleting records"
    exit 1
fi



