import type { ObjectId } from "mongodb";
import type { RequestStatus } from "./Enums.js";
import type { ConversationEntry } from "./ConversationEntry.js";



export interface Conversation {
  _id?: ObjectId;          
  conversationId: string;
  roomName: string;
  status: RequestStatus;
  startedAt: string;
  endedAt?: string;
  messages: ConversationEntry[];
  activeHelpRequestId?: ObjectId | string;
}