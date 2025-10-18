import type { KnowledgeEntry } from "../entities/KnowledgeEntry.js";

export interface IKnowledgeRepository {
  findAll(): Promise<KnowledgeEntry[]>;
  findByQuestion(question: string): Promise<KnowledgeEntry | null>;
  create(entry: Omit<KnowledgeEntry, '_id'>): Promise<KnowledgeEntry>;
  updateUsage(id: string, answer: string): Promise<void>;
  delete(id: string): Promise<void>;
}