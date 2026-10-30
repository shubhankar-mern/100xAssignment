
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("voicebot");
    console.log("Connected to MongoDB Atlas");
  }

  return db;
}

module.exports = { connectDB };
