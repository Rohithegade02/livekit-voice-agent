import type { ObjectId } from "mongodb";
import type { KnowledgeEntry } from "../entities/KnowledgeEntry.js";
import type { IKnowledgeRepository } from "../repositories/IKnowledgeRepository.js";

export class ManageKnowledgeUseCase {
  constructor(private knowledgeRepo: IKnowledgeRepository) {}
  
  async getKnowledgeEntries(): Promise<KnowledgeEntry[]> {
    return this.knowledgeRepo.findAll();
  }
  
  async deleteKnowledgeEntry(id: ObjectId): Promise<void> {
    await this.knowledgeRepo.delete(id);
  }

  async findByQuestion(question: string): Promise<KnowledgeEntry | null> {
    return this.knowledgeRepo.findByQuestion(question);
  }
}