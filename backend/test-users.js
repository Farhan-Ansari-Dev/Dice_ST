require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('dice');
  const count = await db.collection('users').countDocuments();
  console.log("Total Users in DB:", count);
  const users = await db.collection('users').find({}).toArray();
  console.log("Roles:", users.map(u => u.role));
  console.log("Deleted at:", users.map(u => u.deleted_at));
  await client.close();
}
run().catch(console.error);
