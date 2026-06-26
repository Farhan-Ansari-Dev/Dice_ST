require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({});
  users.forEach(u => {
    console.log(`Email: ${u.email}, Name: ${u.name}, Role: ${u.role}`);
  });
  await mongoose.disconnect();
}
run().catch(console.error);
