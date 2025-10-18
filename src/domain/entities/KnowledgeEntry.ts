import type { ObjectId } from "mongodb";

export interface KnowledgeEntry {
  _id?: string;
  question: string;
  answer: string;
  sourceHelpRequestId: string;
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
}