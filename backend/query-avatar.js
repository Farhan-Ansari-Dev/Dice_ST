const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://sanyogconformity1_db_user:1WO8pxNZzay4N3Nv@clusterdice.tdssvro.mongodb.net/dice_prod?retryWrites=true&w=majority');
  
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'info@sanyogconformity.com' });
  
  if (user) {
    console.log('User found:', user.name);
    console.log('Avatar URL length:', user.avatar_url ? user.avatar_url.length : 0);
    if (user.avatar_url) {
      console.log('Avatar URL prefix:', user.avatar_url.substring(0, 100));
    }
  } else {
    console.log('User not found');
  }
  
  await mongoose.disconnect();
}
run().catch(console.error);
