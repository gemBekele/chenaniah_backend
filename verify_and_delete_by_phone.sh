#!/bin/bash

# Script to verify and delete student and appointment records by phone number
# Usage: ./verify_and_delete_by_phone.sh +251988887777

if [ -z "$1" ]; then
    echo "Usage: $0 <phone_number>"
    echo "Example: $0 +251988887777"
    exit 1
fi

PHONE="$1"
DB_USER="${DB_USER:-chenaniah}"
DB_PASS="${DB_PASS:-30433043}"
DB_NAME="chenaniah_db"

echo "=== Checking records for phone: $PHONE ==="
echo ""

# Check students
echo "Students:"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT id, username, phone, appointment_id FROM students WHERE phone = '$PHONE';"

# Check appointments
echo ""
echo "Appointments:"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT id, applicant_name, applicant_phone, scheduled_date, final_decision FROM appointments WHERE applicant_phone = '$PHONE';"

# Check related records
echo ""
echo "Assignment Submissions:"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT asub.id, asub.student_id, s.phone FROM assignment_submissions asub JOIN students s ON asub.student_id = s.id WHERE s.phone = '$PHONE';"

echo ""
echo "Payments:"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT p.id, p.student_id, s.phone FROM payments p JOIN students s ON p.student_id = s.id WHERE s.phone = '$PHONE';"

echo ""
echo "Interview Evaluations:"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT ie.id, ie.appointment_id, a.applicant_phone FROM interview_evaluations ie JOIN appointments a ON ie.appointment_id = a.id WHERE a.applicant_phone = '$PHONE';"

echo ""
read -p "Do you want to delete these records? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deletion cancelled."
    exit 0
fi

echo ""
echo "Deleting records..."

# Delete in correct order
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

echo ""
echo "=== Verification after deletion ==="
echo "Students remaining:"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) as count FROM students WHERE phone = '$PHONE';"

echo "Appointments remaining:"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) as count FROM appointments WHERE applicant_phone = '$PHONE';"



