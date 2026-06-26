const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://sanyogconformity1_db_user:1WO8pxNZzay4N3Nv@clusterdice.tdssvro.mongodb.net/dice?retryWrites=true&w=majority&appName=ClusterDice');
  console.log('Connected to DB');
  
  const { User } = require('./dist/models/User');
  const user = await User.findOne({ role: 'super_admin' });
  console.log('User:', user.name, user._id);

  try {
    const updated = await User.findByIdAndUpdate(user._id, { name: "Sachin Mishra Tested" }, { new: true })
      .select('-password_hash -otp_hash -totp_secret');
    console.log('Updated:', updated.name);
  } catch (err) {
    console.error('Error updating:', err);
  }
  process.exit(0);
}
run();
