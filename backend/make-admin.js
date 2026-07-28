const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb://127.0.0.1:61367/test');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  await User.updateOne({ email: 'cyberfarhanansari@gmail.com' }, { $set: { role: 'super_admin' } });
  console.log("Made cyberfarhanansari super_admin");
  await mongoose.disconnect();
}
run();
