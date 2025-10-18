import type { ObjectId } from "mongodb";
import { RequestStatus } from "../entities/Enums.js";
import type { ConversationEntry } from "../entities/ConversationEntry.js";
import type { Conversation } from "../entities/Conversation.js";

export interface IConversationRepository {
  saveMessage(conversationId: string, entry: ConversationEntry): Promise<void>;
  updateStatus(conversationId: string, newStatus: RequestStatus): Promise<void>;
  setActiveHelpRequest(conversationId: string, helpRequestId: ObjectId): Promise<void>;
  findById(conversationId: string): Promise<Conversation | null>;
  findByStatus(status: RequestStatus): Promise<Conversation[]>;
  completeConversation(conversationId: string): Promise<void>;
  returnToActiveStatus(conversationId: string): Promise<void>;
}