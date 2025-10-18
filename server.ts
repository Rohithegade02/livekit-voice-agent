import express from 'express';
import cors from 'cors';
import { getDb } from './config/db.js';
import { ObjectId } from 'mongodb';
import { HelpRequestStatus,type KnowledgeEntry } from './interface.js';
import { DataPacket_Kind, RoomServiceClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const app = express();
const PORT = process.env.SUPERVISOR_PORT || 3001;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// GET /api/help-requests - Get all pending help requests
app.get('/api/help-requests', async (req : express.Request, res: express.Response) => {
  try {
    const db = await getDb();
    const helpRequests = await db.collection('help_requests')
      .find({ status: HelpRequestStatus.PENDING })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(helpRequests);
  } catch (error) {
    console.error('Error fetching help requests:', error);
    res.status(500).json({ error: 'Failed to fetch help requests' });
  }
});

// POST /api/help-requests/resolve - Resolve a help request
app.post('/api/help-requests/resolve', async (req : express.Request, res: express.Response) => {
  try {
    const { helpRequestId, response } = req.body;

    console.log("Resolving")
    if (!helpRequestId || !response) {
      return res.status(400).json({ error: 'Missing helpRequestId or response' });
    }

    const db = await getDb();
    const objectId = new ObjectId(helpRequestId);

    // 1. Update the help request
    await db.collection('help_requests').updateOne(
      { _id: objectId },
      {
        $set: {
          status: HelpRequestStatus.RESOLVED,
          supervisorResponse: response,
          resolvedAt: new Date().toISOString()
        }
      }
    );

    // 2. Create or update knowledge base entry
    const helpRequest = await db.collection('help_requests').findOne({ _id: objectId });
    if (helpRequest) {
      const existingEntry = await db.collection('knowledge_entries').findOne({
        question: helpRequest.question
      });

      if (existingEntry) {
        // Update existing entry
        await db.collection('knowledge_entries').updateOne(
          { _id: existingEntry._id },
          { 
            $set: { answer: response },
            $inc: { usageCount: 1 },
            // $set: { lastUsed: new Date().toISOString() }
          }
        );
      } else {
        console.log('🎓 Adding new knowledge base entry for:', helpRequest.question);
        // Create new entry
        const knowledgeEntry: KnowledgeEntry = {
          question: helpRequest.question,
          answer: response,
          sourceHelpRequestId: objectId,
          createdAt: new Date().toISOString(),
          usageCount: 1
        };
        
        const result = await db.collection('knowledge_entries').insertOne(knowledgeEntry);
        
        await db.collection('help_requests').updateOne(
          { _id: objectId },
          { $set: { knowledgeBaseEntryId: result.insertedId } }
        );

        // 3. Send notification to LiveKit room using REST API
      await sendSupervisorResponse(helpRequest.conversationId, response);
      }
    }

    // 4. Update conversation status back to ACTIVE
    await db.collection('conversations').updateOne(
      { activeHelpRequestId: objectId },
      { 
        $set: { 
          status: 'ACTIVE',
          activeHelpRequestId: null 
        } 
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving help request:', error);
    res.status(500).json({ error: 'Failed to resolve help request' });
  }
});

// GET /api/knowledge - Get knowledge base entries
app.get('/api/knowledge', async (req, res) => {
  try {
    const db = await getDb();
    const knowledgeEntries = await db.collection('knowledge_entries')
      .find({})
      .sort({ usageCount: -1, lastUsed: -1 })
      .toArray();

    res.json(knowledgeEntries);
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

// DELETE /api/knowledge/:id - Delete a knowledge base entry
app.delete('/api/knowledge/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Missing knowledge entry ID' });
    }

    const db = await getDb();
    await db.collection('knowledge_entries').deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting knowledge entry:', error);
    res.status(500).json({ error: 'Failed to delete knowledge entry' });
  }
});


async function sendSupervisorResponse(roomName: string, answer: string) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('❌ Missing LiveKit credentials. Cannot send supervisor response.');
      return;
    }

    // Create RoomServiceClient
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

    // Convert string to Uint8Array
    const data = new TextEncoder().encode(JSON.stringify({
      type: 'supervisor_response',
      answer: answer,
      conversationId: roomName,
      timestamp: new Date().toISOString()
    }));

    // Send data to the room - Use the correct method signature
    await roomService.sendData(
      roomName,                    // room name
      data,                       // data as Uint8Array
      DataPacket_Kind.RELIABLE,   // delivery kind
      {
        topic: 'supervisor_response'
      }
    );

    console.log(`✅ Supervisor response sent to room ${roomName}: ${answer}`);
  } catch (error) {
    console.error('❌ Error sending supervisor response via LiveKit:', error);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Supervisor API server running on port ${PORT}`);
});