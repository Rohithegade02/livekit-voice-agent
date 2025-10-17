import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://rohithegade8_db_user:EoM39XoH3B8Vf0qb@cluster0.gv6dq8a.mongodb.net/';
const dbName = 'livekit_voice_agent';

let clientPromise: Promise<MongoClient> | null = null;

// Get DB reference, connect once
export async function getDb() {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  const client = await clientPromise;
  return client.db(dbName);
}

