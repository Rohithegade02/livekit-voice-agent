import { ObjectId, type Db } from "mongodb";
import type { KnowledgeEntry } from "../../../../domain/entities/KnowledgeEntry.js";
import type { IKnowledgeRepository } from "../../../../domain/repositories/IKnowledgeRepository.js";

export class KnowledgeRepository implements IKnowledgeRepository {
  constructor(private db: Db) {}

  // Helper to convert Mongo document to KnowledgeEntry
  private toKnowledgeEntry(doc: any): KnowledgeEntry {
    return {
      sourceHelpRequestId: doc.sourceHelpRequestId,
      question: doc.question,
      answer: doc.answer,
      usageCount: doc.usageCount,
      createdAt: doc.createdAt,
      lastUsed: doc.lastUsed,
      _id: doc._id.toString(), // convert ObjectId to string
    };
  }

  async findAll(): Promise<KnowledgeEntry[]> {
    const docs = await this.db
      .collection("knowledge_entries")
      .find({})
      .sort({ usageCount: -1, lastUsed: -1 })
      .toArray();

    return docs.map(this.toKnowledgeEntry);
  }

   async findByQuestion(question: string): Promise<KnowledgeEntry | null> {
    const entries = await this.db.collection<KnowledgeEntry>('knowledge_entries')
      .find({})
      .toArray();

    for (const entry of entries) {
      if (this.isSimilarQuestion(question, entry.question)) {
        // Update usage stats
        await this.db.collection('knowledge_entries').updateOne(
          { _id: entry._id as unknown as ObjectId },
          { 
            $inc: { usageCount: 1 },
            $set: { lastUsed: new Date() }
          }
        );
        return entry;
      }
    }
    return null;
  }

  async create(entry: Omit<KnowledgeEntry, "_id">): Promise<KnowledgeEntry> {
    const result = await this.db.collection("knowledge_entries").insertOne(entry);
    return { ...entry, _id: result.insertedId };
  }

  async updateUsage(id: ObjectId, answer: string): Promise<void> {
    await this.db.collection("knowledge_entries").updateOne(
      { _id: id },
      {
        $set: { answer, lastUsed: new Date() },
        $inc: { usageCount: 1 },
      }
    );
  }

  async delete(id: ObjectId): Promise<void> {
    await this.db.collection("knowledge_entries").deleteOne({ _id: id });
  }
  private isSimilarQuestion(q1: string, q2: string): boolean {
    const words1 = q1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = q2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return false;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity >= 0.6;
  }
}
