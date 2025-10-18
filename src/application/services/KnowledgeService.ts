import type { ObjectId } from "mongodb";
import type { KnowledgeEntry } from "../../domain/entities/KnowledgeEntry.js";
import type { ManageKnowledgeUseCase } from "../../domain/use-cases/ManageKnowledgeUseCase.js";

export  class KnowledgeService {
  constructor(private manageKnowledgeUseCase: ManageKnowledgeUseCase) {}

  async getEntries(): Promise<KnowledgeEntry[]> {
    return this.manageKnowledgeUseCase.getKnowledgeEntries();
  }

  async deleteEntry(id: ObjectId): Promise<void> {
    await this.manageKnowledgeUseCase.deleteKnowledgeEntry(id);
  }

  async findAnswer(question: string): Promise<string | null> {
    const entry = await this.manageKnowledgeUseCase.findByQuestion(question);
    return entry?.answer || null;
  }
}