import type { ObjectId } from "mongodb";
import type { EscalateToSupervisorUseCase } from "../../domain/use-cases/EscalateToSupervisorUseCase.js";

export class EscalationService {
  constructor(
    private escalateToSupervisorUseCase: EscalateToSupervisorUseCase
  ) {}

  async handleEscalation(conversationId: ObjectId, userMessage: string): Promise<ObjectId> {
    return this.escalateToSupervisorUseCase.execute(conversationId, userMessage);
  }

  shouldEscalate(text: string, unknownTopics: string[]): boolean {
    if (!text) return false;

    return unknownTopics.some((topic) =>
      text.toLowerCase().includes(topic.toLowerCase())
    );
  }
}