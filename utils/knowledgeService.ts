import { getDb } from '../config/db.js';
import {type KnowledgeEntry } from '../interface.js';

export async function findAnswerInKnowledgeBase(question: string): Promise<string | null> {
  try {
    const db = await getDb();
    const knowledgeEntries = await db.collection<KnowledgeEntry>('knowledge_entries')
      .find({})
      .toArray();

    // Simple keyword matching - can be enhanced later
    for (const entry of knowledgeEntries) {
      if (isSimilarQuestion(question, entry.question)) {
        // Update usage stats
        await db.collection('knowledge_entries').updateOne(
          { _id: entry._id },
          { 
            $inc: { usageCount: 1 },
            $set: { lastUsed: new Date().toISOString() }
          }
        );
        return entry.answer;
      }
    }
    return null;
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return null;
  }
}

function isSimilarQuestion(q1: string, q2: string): boolean {
  // Simple implementation - match if 60% of words are common
  const words1 = q1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = q2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  const commonWords = words1.filter(word => words2.includes(word));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);
  
  return similarity >= 0.6;
}