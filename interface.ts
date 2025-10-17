import type { ObjectId } from "mongodb";

export type ConversationType = 'user' | 'ai';

export interface ConversationEntry {
  text: string;
  type: ConversationType;
  timestamp: string;
}

export enum RequestStatus {
  ACTIVE = 'ACTIVE',
  WAITING_FOR_HELP = 'WAITING_FOR_HELP', 
  COMPLETED = 'COMPLETED'
}

export enum HelpRequestStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  UNRESOLVED = 'UNRESOLVED'
}

export interface Conversation {
  _id?: ObjectId;          
  conversationId: string;
  roomName: string;
  status: RequestStatus;
  startedAt: string;
  endedAt?: string;
  messages: ConversationEntry[];
  activeHelpRequestId?: ObjectId;
}

export interface HelpRequest {
  _id?: ObjectId;
  conversationId: string;
  question: string;          // Original user question
  createdAt: string;
  resolvedAt?: string;
  status: HelpRequestStatus;
  supervisorResponse?: string;
  knowledgeBaseEntryId?: ObjectId;  // Link to learned answer
}

// NEW: Simple Knowledge Base
export interface KnowledgeEntry {
  _id?: ObjectId;
  question: string;          // Canonical question form
  answer: string;            // Supervisor's approved answer
  sourceHelpRequestId: ObjectId;  // Which request created this
  createdAt: string;
  usageCount: number;        // How many times used
  lastUsed?: string;
}