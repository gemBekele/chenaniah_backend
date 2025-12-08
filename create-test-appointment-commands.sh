#!/bin/bash

# Script to create a test user, submission, and appointment with accepted status
# Production backend URL
BASE_URL="https://chenaniah.org/api/v2/api"

echo "🚀 Creating test user and appointment on production backend..."
echo ""

# Step 1: Create user and submission using Node.js script
echo "📝 Step 1: Creating test user and approved submission..."
cd "$(dirname "$0")"
PHONE_OUTPUT=$(node create-test-user.js 2>&1 | grep -oP 'Phone: \+\d+' | cut -d' ' -f2)

if [ -z "$PHONE_OUTPUT" ]; then
    echo "❌ Failed to create user. Please check the script output above."
    exit 1
fi

export TEST_PHONE="$PHONE_OUTPUT"
echo "✅ Created user with phone: $TEST_PHONE"
echo ""

# Step 2: Get admin token
echo "🔐 Step 2: Getting admin authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -oP '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get admin token. Response: $TOKEN_RESPONSE"
    echo "⚠️  You may need to update the admin credentials in the curl command."
    exit 1
fi

echo "✅ Got admin token"
echo ""

# Step 3: Create a time slot first (if needed)
echo "📅 Step 3: Creating a time slot for the appointment..."
TOMORROW=$(date -d "tomorrow" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d 2>/dev/null || echo "2025-01-15")
TIME_SLOT_RESPONSE=$(curl -s -X POST "$BASE_URL/schedule/time-slots" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"time\": \"14:00\",
    \"date\": \"$TOMORROW\",
    \"location\": \"Main Hall\"
  }")

echo "Time slot response: $TIME_SLOT_RESPONSE"
echo ""

# Step 4: Create appointment
echo "📋 Step 4: Creating interview appointment..."
APPOINTMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/schedule/appointments" \
  -H "Content-Type: application/json" \
  -d "{
    \"applicant_name\": \"Test User\",
    \"applicant_email\": \"test@example.com\",
    \"applicant_phone\": \"$TEST_PHONE\",
    \"scheduled_date\": \"$TOMORROW\",
    \"scheduled_time\": \"14:00\",
    \"selected_song\": \"Test Song\",
    \"notes\": \"Test appointment created via script\"
  }")

APPOINTMENT_ID=$(echo "$APPOINTMENT_RESPONSE" | grep -oP '"appointment_id":\d+' | cut -d':' -f2)

if [ -z "$APPOINTMENT_ID" ]; then
    echo "❌ Failed to create appointment. Response: $APPOINTMENT_RESPONSE"
    exit 1
fi

echo "✅ Created appointment with ID: $APPOINTMENT_ID"
echo ""

# Step 5: Set appointment status to accepted
echo "✅ Step 5: Setting appointment final decision to 'accepted'..."
DECISION_RESPONSE=$(curl -s -X PUT "$BASE_URL/schedule/appointments/$APPOINTMENT_ID/decision" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"accepted"}')

echo "Decision response: $DECISION_RESPONSE"
echo ""

echo "🎉 Success! Created:"
echo "   - Test User with phone: $TEST_PHONE"
echo "   - Approved Submission"
echo "   - Interview Appointment (ID: $APPOINTMENT_ID)"
echo "   - Appointment status: accepted"
echo ""
echo "You can verify by checking the appointment:"
echo "curl -X GET \"$BASE_URL/schedule/appointments\" -H \"Authorization: Bearer $TOKEN\" | grep -A 10 \"$APPOINTMENT_ID\""



