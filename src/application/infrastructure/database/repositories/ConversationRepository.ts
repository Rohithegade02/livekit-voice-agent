import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import type { IConversationRepository } from "../../../../domain/repositories/IConversationRepository.js";
import type { Conversation } from "../../../../domain/entities/Conversation.js";
import type { ConversationEntry } from "../../../../domain/entities/ConversationEntry.js";
import { RequestStatus } from "../../../../domain/entities/Enums.js";

export class ConversationRepository implements IConversationRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<Conversation>('conversations');
  }

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

  async findById(conversationId: string): Promise<Conversation | null> {
    return this.collection.findOne({
      conversationId,
      status: { $in: [RequestStatus.ACTIVE, RequestStatus.WAITING_FOR_HELP] },
    });
  }

  async findByStatus(status: RequestStatus): Promise<Conversation[]> {
    return this.collection.find({ status }).sort({ startedAt: -1 }).toArray();
  }

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