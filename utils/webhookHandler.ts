import { WebhookReceiver } from 'livekit-server-sdk';
import { ObjectId } from 'mongodb';
import { RequestStatus } from '../interface.js';
import { getDb } from '../config/db.js';

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function handleWebhookEvent(rawBody: string, authHeader: string) {
  try {
    // Validate and parse the webhook
    const event = await receiver.receive(rawBody, authHeader);
    
    console.log('🔔 Webhook received:', event.event);
    
    switch (event.event) {
      case 'participant_joined':
        await handleParticipantJoined(event);
        break;
      case 'participant_left':
        await handleParticipantLeft(event);
        break;
      case 'room_finished':
        await handleRoomFinished(event);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}

async function handleParticipantJoined(event: any) {
  console.log(`👋 Participant joined: ${event.participant.identity} in ${event.room.name}`);
  
  // You could update conversation status when someone joins
  // For now, just log it
}

async function handleParticipantLeft(event: any) {
  console.log(`🚪 Participant left: ${event.participant.identity} from ${event.room.name}`);
  
  // Mark conversation as completed when participant leaves
  const db = await getDb();
  await db.collection('conversations').updateOne(
    { conversationId: event.room.name },
    { 
      $set: { 
        status: RequestStatus.COMPLETED,
        endedAt: new Date().toISOString()
      } 
    }
  );
  
  console.log(`✅ Marked conversation ${event.room.name} as completed`);
}

async function handleRoomFinished(event: any) {
  console.log(`🏁 Room finished: ${event.room.name}`);
  
  // Ensure conversation is marked as completed
  const db = await getDb();
  await db.collection('conversations').updateOne(
    { conversationId: event.room.name },
    { 
      $set: { 
        status: RequestStatus.COMPLETED,
        endedAt: new Date().toISOString()
      } 
    }
  );
}