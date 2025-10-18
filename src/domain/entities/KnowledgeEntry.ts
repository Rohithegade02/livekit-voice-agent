import type { ObjectId } from "mongodb";

export interface KnowledgeEntry {
  _id?: ObjectId;
  question: string;
  answer: string;
  sourceHelpRequestId: ObjectId;
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
}