const http = require('http');

async function testAdminApp() {
  console.log("0. Sending OTP...");
  await fetch('http://localhost:5001/api/v2/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cyberfarhanansari@gmail.com' })
  });

  console.log("1. Logging in as admin...");
  const res1 = await fetch('http://localhost:5001/api/v2/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cyberfarhanansari@gmail.com', otp: '123456' })
  });
  const data1 = await res1.json();
  if (!data1.success) return;
  const token = data1.data.accessToken;

  console.log("2. Fetching applications...");
  const res2 = await fetch('http://localhost:5001/api/v2/applications', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data2 = await res2.json();
  const apps = data2.data;
  console.log(`Found ${apps.length} apps.`);
  if (apps.length === 0) return;

  const app = apps[0];
  console.log(`Latest app: ${app.application_number} (Status: ${app.status})`);

  console.log("3. Updating application status to 'submitted'...");
  const res3 = await fetch(`http://localhost:5001/api/v2/applications/${app._id}/transition`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ to_status: 'submitted', reason: 'Automated test' })
  });
  const data3 = await res3.json();
  console.log("Update response:", data3);
}
testAdminApp().catch(console.error);
