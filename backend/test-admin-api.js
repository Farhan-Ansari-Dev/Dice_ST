const http = require('http');

async function testAdmin() {
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

  console.log("2. Fetching leads...");
  const res2 = await fetch('http://localhost:5001/api/v2/leads', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data2 = await res2.json();
  const leads = data2.data;
  console.log(`Found ${leads.length} leads.`);
  if (leads.length === 0) return;

  const lead = leads[0];
  console.log(`Latest lead: ${lead.service_name} (Status: ${lead.status})`);

  console.log("3. Updating lead status to 'contacted'...");
  const res3 = await fetch(`http://localhost:5001/api/v2/leads/${lead._id}/status`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ status: 'contacted', notes: 'Automated test contacted' })
  });
  const data3 = await res3.json();
  console.log("Update response:", data3.success);
}
testAdmin().catch(console.error);
