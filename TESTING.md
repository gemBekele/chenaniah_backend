# Backend Endpoint Testing Guide

## Prerequisites

1. Ensure the backend server is running: `npm run dev`
2. Ensure database is set up and migrations are run: `npx prisma migrate dev`
3. Seed data: `npm run seed:students`

## Manual Testing

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

### 2. Admin Authentication
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### 3. Student Registration
```bash
# First, get an accepted appointment phone number
# Then register:
curl -X POST http://localhost:5000/api/auth/student/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teststudent",
    "password": "password123",
    "fullNameAmharic": "ምሳሌ",
    "fullNameEnglish": "Test Student",
    "phone": "0912345678"
  }'
```

### 4. Student Login
```bash
curl -X POST http://localhost:5000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teststudent","password":"password123"}'
```

### 5. Get All Trainees (Admin)
```bash
curl http://localhost:5000/api/admin/trainees \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 6. Get Trainee Details (Admin)
```bash
curl http://localhost:5000/api/admin/trainees/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 7. Create Assignment (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/trainees/assignments \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Assignment",
    "description": "Test description",
    "dueDate": "2024-12-31T23:59:59Z"
  }'
```

### 8. Get All Assignments (Admin)
```bash
curl http://localhost:5000/api/admin/trainees/assignments/all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 9. Get Student Assignments
```bash
curl http://localhost:5000/api/student/assignments \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

### 10. Submit Assignment
```bash
curl -X POST http://localhost:5000/api/student/submit-assignment \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -F "assignmentId=1" \
  -F "text=My submission text"
```

### 11. Grade Assignment (Admin)
```bash
curl -X PUT http://localhost:5000/api/admin/trainees/assignments/submissions/1/grade \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grade": 85,
    "feedback": "Great work!"
  }'
```

### 12. Get All Payments (Admin)
```bash
curl http://localhost:5000/api/admin/trainees/payments/all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 13. Update Payment Status (Admin)
```bash
curl -X PUT http://localhost:5000/api/admin/trainees/payments/1/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}'
```

### 14. Upload Resource (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/resources/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "title=Resource Title" \
  -F "description=Resource Description"
```

### 15. Create Link Resource (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/resources \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "External Link",
    "description": "Link description",
    "type": "link",
    "url": "https://example.com"
  }'
```

### 16. Get Resources
```bash
curl http://localhost:5000/api/resources \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

## Automated Testing

Run the automated test script:
```bash
npm run test:endpoints
```

## Expected Results

All endpoints should return:
- Status 200 for successful requests
- JSON response with `success: true`
- Appropriate error messages for failed requests

## Common Issues

1. **401 Unauthorized**: Check that the token is valid and included in Authorization header
2. **404 Not Found**: Ensure the endpoint URL is correct
3. **500 Internal Server Error**: Check server logs for details
4. **Database errors**: Ensure Prisma migrations are up to date









