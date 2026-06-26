const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/dice-test');
  
  const UserSchema = new mongoose.Schema({ name: String, avatar_url: String });
  const User = mongoose.model('UserTest', UserSchema);
  
  const user = await User.create({ name: 'Old Name' });
  
  try {
    const updated = await User.findByIdAndUpdate(user._id, { name: 'New Name' }, { new: true }).select('-password');
    console.log('Success:', updated.name);
  } catch (err) {
    console.log('Error:', err.message);
  }
  process.exit(0);
}
run();
