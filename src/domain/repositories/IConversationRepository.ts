import type { ObjectId } from "mongodb";
import { RequestStatus } from "../entities/Enums.js";
import type { ConversationEntry } from "../entities/ConversationEntry.js";
import type { Conversation } from "../entities/Conversation.js";

export interface IConversationRepository {
  saveMessage(conversationId: ObjectId, entry: ConversationEntry): Promise<void>;
  updateStatus(conversationId: ObjectId, newStatus: RequestStatus): Promise<void>;
  setActiveHelpRequest(conversationId: ObjectId, helpRequestId: ObjectId): Promise<void>;
  findById(conversationId: ObjectId): Promise<Conversation | null>;
  findByStatus(status: RequestStatus): Promise<Conversation[]>;
  completeConversation(conversationId: ObjectId): Promise<void>;
  returnToActiveStatus(conversationId: ObjectId): Promise<void>;
  activateConversation(helpRequestId: ObjectId): Promise<void>;
}