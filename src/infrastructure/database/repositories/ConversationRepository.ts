import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import type { IConversationRepository } from "../../../domain/repositories/IConversationRepository.js";
import type { Conversation } from "../../../domain/entities/Conversation.js";
import { RequestStatus } from "../../../domain/entities/Enums.js";
import type { ConversationEntry } from "../../../domain/entities/ConversationEntry.js";


export class ConversationRepository implements IConversationRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<Conversation>('conversations');
  }
// Save a message to an active conversation or create a new one
  async saveMessage(conversationId: string, entry: ConversationEntry): Promise<void> {
    const activeSession = await this.collection.findOne({
      conversationId,
      status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] },
    });

    if (activeSession) {
      await this.collection.updateOne(
        { _id: activeSession._id },
        { $push: { messages: entry } }
      );
    } else {
      await this.collection.insertOne({
        conversationId,
        roomName: conversationId,
        status: RequestStatus.ACTIVE,
        startedAt: new Date().toISOString(),
        messages: [entry],
      });
    }
  }
// Update the status of a conversation
  async updateStatus(conversationId: string, newStatus: RequestStatus): Promise<void> {
    const updateData: any = { status: newStatus };
    
    if (newStatus === RequestStatus.COMPLETED) {
      updateData.endedAt = new Date();
    }

    await this.collection.updateOne(
      { conversationId: conversationId as unknown as string, status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] } },
      { $set: updateData }
    );
  }

  // Set the active help request for a conversation (especially when escalation occurs)
  async setActiveHelpRequest(conversationId: string, helpRequestId: string): Promise<void> {
    await this.collection.updateOne(
      { conversationId: conversationId as unknown as string, status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] } },
      { 
        $set: { 
          status: RequestStatus.WAITING_FOR_HELP,
          activeHelpRequestId:  helpRequestId 
        } 
      }
    );
  }
// Find an active conversation by its ID
  async findById(conversationId: string): Promise<Conversation | null> {
    return this.collection.findOne({
      conversationId,
      status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] },
    });
  }
// Find conversations by their status
  async findByStatus(status: RequestStatus): Promise<Conversation[]> {
    return this.collection.find({ status }).sort({ startedAt: -1 }).toArray();
  }
// Mark a conversation as completed
  async completeConversation(conversationId: string): Promise<void> {
    await this.collection.updateOne(
      { conversationId, status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] } },
      { 
        $set: { 
          status: RequestStatus.COMPLETED,
          endedAt: new Date().toISOString()
        } 
      }
    );
  }
// Return a conversation to active status after help request resolution
  async returnToActiveStatus(conversationId: string): Promise<void> {
    await this.collection.updateOne(
      { conversationId },
      { 
        $set: { 
          status: RequestStatus.ACTIVE,
        //   activeHelpRequestId: null 
        } 
      }
    );
  }
// Activate conversation by help request ID
  async activateConversation(helpRequestId: string): Promise<void> {
    await this.collection.updateOne(
      { activeHelpRequestId: helpRequestId },
      { 
        $set: { 
          status: RequestStatus.ACTIVE,
          // activeHelpRequestId: null 
        } 
      }
    );
  }
}