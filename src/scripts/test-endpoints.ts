import { config } from '../config';

const API_BASE_URL = `http://localhost:${config.api.port}/api`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

interface ApiResponse {
  error?: string;
  [key: string]: any;
}

interface AdminLoginResponse {
  token?: string;
  [key: string]: any;
}

interface AppointmentsResponse {
  appointments?: Array<{
    final_decision?: string;
    applicant_phone?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: string,
  url: string,
  options: RequestInit = {}
): Promise<TestResult> {
  try {
    const response = await fetch(url, {
      method,
      ...options,
    });

    const data = (await response.json().catch(() => ({}))) as ApiResponse;

    if (response.ok || response.status < 500) {
      return {
        name,
        passed: true,
        response: data,
      };
    } else {
      return {
        name,
        passed: false,
        error: `Status ${response.status}: ${data.error || 'Unknown error'}`,
      };
    }
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Backend Endpoints...\n');

  // Get admin token first
  const adminLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.auth.adminUsername,
      password: config.auth.adminPassword,
    }),
  });

  const adminData = (await adminLoginResponse.json()) as AdminLoginResponse;
  const adminToken = adminData.token;

  if (!adminToken) {
    console.error('❌ Failed to get admin token');
    return;
  }

  console.log('✅ Admin authentication successful\n');

  // Test endpoints
  results.push(
    await testEndpoint('Health Check', 'GET', `${API_BASE_URL}/health`)
  );

  results.push(
    await testEndpoint(
      'Get All Trainees',
      'GET',
      `${API_BASE_URL}/admin/trainees`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
  );

  results.push(
    await testEndpoint(
      'Get All Assignments',
      'GET',
      `${API_BASE_URL}/admin/trainees/assignments/all`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
  );

  results.push(
    await testEndpoint(
      'Get All Payments',
      'GET',
      `${API_BASE_URL}/admin/trainees/payments/all`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
  );

  results.push(
    await testEndpoint(
      'Get All Resources',
      'GET',
      `${API_BASE_URL}/resources`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
  );

  // Test student registration (if we have an accepted appointment)
  const appointmentsResponse = await fetch(`${API_BASE_URL}/schedule/appointments`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const appointmentsData = (await appointmentsResponse.json()) as AppointmentsResponse;
  
  if (appointmentsData.appointments && appointmentsData.appointments.length > 0) {
    const acceptedAppt = appointmentsData.appointments.find(
      (apt) => apt.final_decision === 'accepted'
    );

    if (acceptedAppt) {
      results.push(
        await testEndpoint(
          'Student Registration',
          'POST',
          `${API_BASE_URL}/auth/student/register`,
          {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: `teststudent${Date.now()}`,
              password: 'testpass123',
              fullNameAmharic: 'ምሳሌ',
              fullNameEnglish: 'Test Student',
              phone: acceptedAppt.applicant_phone,
            }),
          }
        )
      );
    }
  }

  // Print results
  console.log('\n📊 Test Results:\n');
  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}`);
      console.log(`   Error: ${result.error}`);
      failed++;
    }
  });

  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
}

// Run tests
runTests().catch(console.error);







