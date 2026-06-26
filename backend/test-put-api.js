const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://sanyogconformity1_db_user:1WO8pxNZzay4N3Nv@clusterdice.tdssvro.mongodb.net/dice?retryWrites=true&w=majority&appName=ClusterDice');
  const { User } = require('./dist/models/User');
  const user = await User.findOne({ role: 'super_admin' });
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    'c9cHYLjtxU08HSqHYSwP1iKQl+LFxAHti+GK5N6xd5GELBBxl93KFRuFb5OqCa5ueYxhOdyQAJByxukxIcmA3g==',
    { expiresIn: '1h' }
  );

  try {
    const res = await fetch('https://api.sanyogconformity.com/api/v1/users/me', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Sachin Mishra' })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch Error:', err);
  }
  process.exit(0);
}
run();
