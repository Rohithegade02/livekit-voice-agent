import type { ObjectId } from "mongodb";
import type { KnowledgeEntry } from "../entities/KnowledgeEntry.js";

export interface IKnowledgeRepository {
  findAll(): Promise<KnowledgeEntry[]>;
  findByQuestion(question: string): Promise<KnowledgeEntry | null>;
  create(entry: Omit<KnowledgeEntry, '_id'>): Promise<KnowledgeEntry>;
  updateUsage(id: ObjectId, answer: string): Promise<void>;
  delete(id: ObjectId): Promise<void>;
}