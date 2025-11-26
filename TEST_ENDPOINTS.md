# API Endpoint Testing Guide

This document provides curl commands to test all API endpoints.

## Base URL
```bash
BASE_URL="http://localhost:5000"
```

## 1. Health Check
```bash
curl -X GET $BASE_URL/api/health
```

## 2. Authentication

### Admin Login
```bash
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"
```

### Coordinator Login
```bash
COORD_TOKEN=$(curl -s -X POST $BASE_URL/api/auth/coordinator/login \
  -H "Content-Type: application/json" \
  -d '{"username":"coordinator","password":"coordinator123"}' | jq -r '.token')

echo "Coordinator Token: $COORD_TOKEN"
```

## 3. Submissions

### Get All Submissions
```bash
curl -X GET "$BASE_URL/api/submissions" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Submissions with Filters
```bash
# Filter by status
curl -X GET "$BASE_URL/api/submissions?status=pending" \
  -H "Authorization: Bearer $TOKEN"

# Search
curl -X GET "$BASE_URL/api/submissions?search=john" \
  -H "Authorization: Bearer $TOKEN"

# Pagination
curl -X GET "$BASE_URL/api/submissions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Submission by ID
```bash
curl -X GET "$BASE_URL/api/submissions/1" \
  -H "Authorization: Bearer $TOKEN"
```

### Update Submission Status
```bash
curl -X PUT "$BASE_URL/api/submissions/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","comments":"Great application!"}'
```

## 4. Statistics

### Get Submission Stats
```bash
curl -X GET "$BASE_URL/api/stats" \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Registration Status

### Get Registration Status
```bash
curl -X GET "$BASE_URL/api/registration/status" \
  -H "Authorization: Bearer $TOKEN"
```

### Set Registration Status
```bash
curl -X PUT "$BASE_URL/api/registration/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"registration_open":true}'
```

## 6. Scheduling - Time Slots

### Get Time Slots (PUBLIC - No Auth)
```bash
# All time slots
curl -X GET "$BASE_URL/api/schedule/time-slots"

# Filter by date
curl -X GET "$BASE_URL/api/schedule/time-slots?date=2025-11-20"
```

### Create Time Slot
```bash
curl -X POST "$BASE_URL/api/schedule/time-slots" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time":"14:00",
    "date":"2025-11-20",
    "location":"Main Hall"
  }'
```

### Bulk Create Time Slots
```bash
curl -X POST "$BASE_URL/api/schedule/time-slots/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date":"2025-11-20",
    "start_time":"09:00",
    "end_time":"17:00",
    "interval_minutes":30,
    "location":"Main Hall"
  }'
```

### Update Time Slot
```bash
curl -X PUT "$BASE_URL/api/schedule/time-slots/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"available":false}'
```

## 7. Scheduling - Appointments

### Get Appointments
```bash
curl -X GET "$BASE_URL/api/schedule/appointments" \
  -H "Authorization: Bearer $TOKEN"

# With search
curl -X GET "$BASE_URL/api/schedule/appointments?search=john" \
  -H "Authorization: Bearer $TOKEN"
```

### Create Appointment (PUBLIC - No Auth)
```bash
curl -X POST "$BASE_URL/api/schedule/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "applicant_name":"John Doe",
    "applicant_email":"john@example.com",
    "applicant_phone":"+1234567890",
    "scheduled_date":"2025-11-20",
    "scheduled_time":"14:00",
    "selected_song":"Amazing Grace",
    "additional_song":"How Great Thou Art",
    "additional_song_singer":"Artist Name"
  }'
```

### Update Appointment Status
```bash
curl -X PUT "$BASE_URL/api/schedule/appointments/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

### Mark Attendance (Coordinator/Admin)
```bash
curl -X PUT "$BASE_URL/api/schedule/appointments/1/attendance" \
  -H "Authorization: Bearer $COORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"present":true}'
```

### Approve Applicant (Coordinator/Admin)
```bash
curl -X PUT "$BASE_URL/api/schedule/appointments/1/approve" \
  -H "Authorization: Bearer $COORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved":true}'
```

### Get Verified Appointments (Coordinator/Admin)
```bash
curl -X GET "$BASE_URL/api/schedule/appointments/attendance" \
  -H "Authorization: Bearer $COORD_TOKEN"
```

### Set Final Decision
```bash
curl -X PUT "$BASE_URL/api/schedule/appointments/1/decision" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"accepted"}'
```

## 8. Applicant Verification (PUBLIC)

### Verify Applicant
```bash
curl -X POST "$BASE_URL/api/schedule/verify-applicant" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890"}'
```

### Check Existing Appointment
```bash
curl -X POST "$BASE_URL/api/schedule/appointments/check" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890"}'
```

### Get Applicant Status
```bash
curl -X POST "$BASE_URL/api/applicant/status" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890"}'
```

## 9. Schedule Statistics

### Get Schedule Stats
```bash
curl -X GET "$BASE_URL/api/schedule/stats" \
  -H "Authorization: Bearer $TOKEN"
```

## 10. Audio Files

### Serve Audio File
```bash
curl -X GET "$BASE_URL/api/audio/2024/11/20/audio_file.mp3" \
  -H "Authorization: Bearer $TOKEN" \
  --output audio_file.mp3
```

## Complete Test Script

Save this as `test-all-endpoints.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"

echo "=== Testing Health Check ==="
curl -X GET $BASE_URL/api/health
echo -e "\n"

echo "=== Testing Admin Login ==="
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
echo "Token: $TOKEN"
echo -e "\n"

echo "=== Testing Get Submissions ==="
curl -X GET "$BASE_URL/api/submissions" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "=== Testing Get Stats ==="
curl -X GET "$BASE_URL/api/stats" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "=== Testing Get Time Slots (PUBLIC) ==="
curl -X GET "$BASE_URL/api/schedule/time-slots"
echo -e "\n"

echo "=== Testing Get Schedule Stats ==="
curl -X GET "$BASE_URL/api/schedule/stats" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "All tests completed!"
```

Make it executable:
```bash
chmod +x test-all-endpoints.sh
./test-all-endpoints.sh
```



