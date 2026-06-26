const mongoose = require('mongoose');

const uri = "mongodb+srv://sanyogconformity1_db_user:1WO8pxNZzay4N3Nv@clusterdice.tdssvro.mongodb.net/dice?retryWrites=true&w=majority&appName=ClusterDice";

async function run() {
  await mongoose.connect(uri);
  
  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.model('User', userSchema, 'users');
  
  // Check if exists
  const existing = await User.findOne({ email: 'info@sanyogconformity.com' });
  if (existing) {
    await User.updateOne({ _id: existing._id }, { $set: { role: 'super_admin', is_active: true } });
    console.log("Updated existing user to super_admin.");
  } else {
    await User.create({
      email: 'info@sanyogconformity.com',
      name: 'Super Admin',
      role: 'super_admin',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log("Created new super_admin user.");
  }
  
  await mongoose.disconnect();
}
run().catch(console.error);
