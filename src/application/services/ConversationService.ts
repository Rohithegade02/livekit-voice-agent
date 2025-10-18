import type { ObjectId } from "mongodb";
import type { IConversationRepository } from "../../domain/repositories/IConversationRepository.js";
import type { ConversationEntry } from "../../domain/entities/ConversationEntry.js";
import { RequestStatus } from "../../domain/entities/Enums.js";

export class ConversationService {
  constructor(private conversationRepository: IConversationRepository) {}

  async saveMessage(conversationId: ObjectId, entry: ConversationEntry): Promise<void> {
    await this.conversationRepository.saveMessage(conversationId, entry);
  }

  async updateStatus(conversationId: ObjectId, newStatus: RequestStatus): Promise<void> {
    await this.conversationRepository.updateStatus(conversationId, newStatus);
  }

  async setActiveHelpRequest(conversationId: ObjectId, helpRequestId: ObjectId): Promise<void> {
    await this.conversationRepository.setActiveHelpRequest(conversationId, helpRequestId);
  }

  async getConversation(conversationId: ObjectId) {
    return this.conversationRepository.findById(conversationId);
  }

  async completeConversation(conversationId: ObjectId): Promise<void> {
    await this.conversationRepository.completeConversation(conversationId);
  }

  async returnToActiveStatus(conversationId: ObjectId): Promise<void> {
    await this.conversationRepository.returnToActiveStatus(conversationId);
  }
}