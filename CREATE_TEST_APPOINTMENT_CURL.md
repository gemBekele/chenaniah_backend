# Create Test User and Interview Appointment with Accepted Status

## Production Backend URL
```
https://chenaniah.org/api/v2/api
```

## Step 1: Create User and Submission (Required - No API endpoint exists)

Since there's no API endpoint to create users/submissions, run this script first:

```bash
cd /home/barch/projects/chenaniah/backend
node create-test-user.js
```

This will output a phone number. Export it:
```bash
export TEST_PHONE="+2519XXXXXXXX"  # Use the phone number from the script output
```

## Step 2: Get Admin Token

```bash
BASE_URL="https://chenaniah.org/api/v2/api"

TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"
```

**Note:** Update the admin password if it's different in production.

## Step 3: Create Time Slot (if needed)

```bash
# Get tomorrow's date
TOMORROW=$(date -d "tomorrow" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d 2>/dev/null || echo "2025-01-15")

curl -X POST "$BASE_URL/schedule/time-slots" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"time\": \"14:00\",
    \"date\": \"$TOMORROW\",
    \"location\": \"Main Hall\"
  }"
```

## Step 4: Create Interview Appointment

```bash
curl -X POST "$BASE_URL/schedule/appointments" \
  -H "Content-Type: application/json" \
  -d "{
    \"applicant_name\": \"Test User\",
    \"applicant_email\": \"test@example.com\",
    \"applicant_phone\": \"$TEST_PHONE\",
    \"scheduled_date\": \"$TOMORROW\",
    \"scheduled_time\": \"14:00\",
    \"selected_song\": \"Test Song\",
    \"notes\": \"Test appointment created via curl\"
  }"
```

Save the `appointment_id` from the response:
```bash
APPOINTMENT_ID=<id_from_response>
```

## Step 5: Set Appointment to Accepted Status

```bash
curl -X PUT "$BASE_URL/schedule/appointments/$APPOINTMENT_ID/decision" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"accepted"}'
```

## Complete One-Liner Script

Or run the automated script:
```bash
cd /home/barch/projects/chenaniah/backend
./create-test-appointment-commands.sh
```

## Verify the Appointment

```bash
curl -X GET "$BASE_URL/schedule/appointments" \
  -H "Authorization: Bearer $TOKEN" | jq '.appointments[] | select(.id == '$APPOINTMENT_ID')'
```

The appointment should have `final_decision: "accepted"`.



