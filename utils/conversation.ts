import { RequestStatus, type ConversationEntry, type Conversation } from '../interface.js';
import { getDb } from '../config/db.js';
import type { ObjectId } from 'mongodb';

// Save a message in the current active session or create a new session
export async function saveConversation(conversationId: string, entry: ConversationEntry) {
  const db = await getDb();
  const collection = db.collection<Conversation>('conversations');

  // Find active session - using updated RequestStatus values
  const activeSession = await collection.findOne({
    conversationId,
    status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] },
  });

  if (activeSession) {
    // Append message to existing session
    await collection.updateOne(
      { _id: activeSession._id },
      { $push: { messages: entry } }
    );
  } else {
    // Create new session document
    await collection.insertOne({
      conversationId,
      roomName: conversationId,
      status: RequestStatus.ACTIVE, // Start as ACTIVE instead of PENDING
      startedAt: new Date().toISOString(),
      messages: [entry],
    });
  }
}

// Update status of the latest active session
export async function updateSessionStatus(conversationId: string, newStatus: RequestStatus) {
  const db = await getDb();
  const collection = db.collection<Conversation>('conversations');

  await collection.updateOne(
    { conversationId, status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] } },
    { 
      $set: { 
        status: newStatus,
        // Only set endedAt if completing the conversation
        ...(newStatus === RequestStatus.COMPLETED && { endedAt: new Date().toISOString() })
      } 
    }
  );
}

// Set active help request for a conversation
export async function setActiveHelpRequest(conversationId: string, helpRequestId: ObjectId) {
  const db = await getDb();
  const collection = db.collection<Conversation>('conversations');
  
  await collection.updateOne(
    { conversationId, status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] } },
    { 
      $set: { 
        status: RequestStatus.WAITING_FOR_HELP,
        activeHelpRequestId: helpRequestId 
      } 
    }
  );
}

// Get conversation by ID
export async function getConversation(conversationId: string) {
  const db = await getDb();
  const collection = db.collection<Conversation>('conversations');
  return collection.findOne({
    conversationId,
    status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] },
  });
}

// Optional: Fetch sessions by status (for supervisor UI)
export async function getSessionsByStatus(status: RequestStatus) {
  const db = await getDb();
  const collection = db.collection<Conversation>('conversations');
  return collection.find({ status }).sort({ startedAt: -1 }).toArray();
}

// Handle conversation completion
export async function completeConversation(conversationId: string) {
  const db = await getDb();
  const collection = db.collection<Conversation>('conversations');

  await collection.updateOne(
    { conversationId, status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] } },
    { 
      $set: { 
        status: RequestStatus.COMPLETED,
        endedAt: new Date().toISOString(),
        // activeHelpRequestId: null // Optionally clear active help request
      } 
    }
  );
}


export async function returnToActiveStatus(conversationId: string) {
  const db = await getDb();
  const collection = db.collection<Conversation>('conversations');

  await collection.updateOne(
    { conversationId },
    { 
      $set: { 
        status: RequestStatus.ACTIVE,
        // activeHelpRequestId: null // Optionally clear active help request
      } 
    }
  );
}