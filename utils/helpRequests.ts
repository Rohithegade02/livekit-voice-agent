import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { HelpRequestStatus, type HelpRequest } from '../interface.js';

// Create a new help request
export async function createHelpRequest(conversationId: string, question: string) {
  const db = await getDb();
  const collection = db.collection<HelpRequest>('help_requests');

  const request: HelpRequest = {
    conversationId,
    question,
    status: HelpRequestStatus.PENDING,  // Fixed: Use HelpRequestStatus
    createdAt: new Date().toISOString(),
  };

  const result = await collection.insertOne(request);
  console.log(`📩 Supervisor ping: Hey, I need help answering "${question}"`);
  return result.insertedId;
}

// Mark as resolved with supervisor response
export async function resolveHelpRequest(id: string, response: string) {
  const db = await getDb();
  const collection = db.collection<HelpRequest>('help_requests');

  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: HelpRequestStatus.RESOLVED,
        supervisorResponse: response,
        resolvedAt: new Date().toISOString(),
      },
    }
  );
}

// Get all pending requests (for Supervisor UI)
export async function getPendingHelpRequests() {
  const db = await getDb();
  const collection = db.collection<HelpRequest>('help_requests');
  return collection.find({ status: HelpRequestStatus.PENDING }).toArray();  // Fixed status
}