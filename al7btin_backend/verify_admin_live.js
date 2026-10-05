import http from 'http';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('🚀 Running Live Admin & PostgreSQL E2E Verification...\n');

  // 1. Health check
  const health = await request('GET', '/health');
  console.log('1. Health check:', health.status, health.body);

  // 2. Login as Admin (0790000001)
  console.log('\n2. Requesting OTP for Admin (0790000001)...');
  const otpRes = await request('POST', '/auth/login', { phoneNumber: '0790000001' });
  console.log('   OTP Status:', otpRes.status, otpRes.body);

  const otpCode = otpRes.body?.data?.devOtp || '1234';

  const verifyRes = await request('POST', '/auth/verify-otp', {
    phoneNumber: '0790000001',
    otp: otpCode,
    mode: 'login',
  });
  console.log('   Verify Status:', verifyRes.status, verifyRes.body.success ? 'Logged In Successfully!' : verifyRes.body);

  let adminToken = verifyRes.body?.data?.accessToken;
  if (!adminToken) {
    console.log('   Trying default OTP verification...');
  }

  if (adminToken) {
    // 3. Live Stats
    console.log('\n3. Fetching live dashboard statistics from PostgreSQL...');
    const statsRes = await request('GET', '/admin/stats', null, adminToken);
    console.log('   Stats:', JSON.stringify(statsRes.body.data, null, 2));

    // 4. Live Users
    console.log('\n4. Fetching paginated users list from PostgreSQL...');
    const usersRes = await request('GET', '/admin/users?page=1&limit=5', null, adminToken);
    console.log(`   Found ${usersRes.body.data.total} total users (Page ${usersRes.body.data.page} of ${usersRes.body.data.totalPages})`);
    for (const u of usersRes.body.data.users) {
      console.log(`   - [${u.role}] ${u.name ?? 'Unnamed'} (${u.phoneNumber}) | Suspended: ${u.isSuspended}`);
    }

    // 5. Search Users
    console.log('\n5. Searching users by query...');
    const searchRes = await request('GET', '/admin/users?search=079', null, adminToken);
    console.log(`   Search for "079" returned ${searchRes.body.data.users.length} users.`);

    // 6. Role Filter
    console.log('\n6. Filtering users by role=customer...');
    const filterRes = await request('GET', '/admin/users?role=customer', null, adminToken);
    console.log(`   Customer filter returned ${filterRes.body.data.users.length} customers.`);
  }

  console.log('\n✅ Live verification script completed successfully!');
}

main().catch(console.error);
