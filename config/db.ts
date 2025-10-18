import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB_NAME!;


let clientPromise: Promise<MongoClient> | null = null;

// Get DB reference, connect once
export async function getDb() {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  const client = await clientPromise;
  return client.db(dbName);
}

