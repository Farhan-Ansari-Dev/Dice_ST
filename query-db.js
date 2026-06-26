const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://sanyogconformity1_db_user:1WO8pxNZzay4N3Nv@clusterdice.tdssvro.mongodb.net/dice_prod?retryWrites=true&w=majority');
  
  const db = mongoose.connection.db;
  const applications = await db.collection('applications').find({}).toArray();
  
  console.log(`Total applications: ${applications.length}`);
  
  const missingCreatedAt = applications.filter(app => !app.created_at);
  console.log(`Missing created_at: ${missingCreatedAt.length}`);
  
  if (missingCreatedAt.length > 0) {
    console.log(missingCreatedAt[0]);
  }
  
  await mongoose.disconnect();
}
run().catch(console.error);
