import type { ObjectId } from "mongodb";
import type { IHelpRequestRepository } from "../repositories/IHelpRequestRepository.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";
import { HelpRequestStatus } from "../entities/Enums.js";

export class EscalateToSupervisorUseCase {
  constructor(
    private helpRequestRepository: IHelpRequestRepository,
    private conversationRepository: IConversationRepository
  ) {}

  async execute(conversationId: ObjectId, question: string): Promise<ObjectId> {
    // 1. Create help request
    const helpRequest = await this.helpRequestRepository.create({
      conversationId: conversationId as unknown as string,
      question,
      status: HelpRequestStatus.PENDING,
      createdAt: new Date()
    });

    // 2. Update conversation status
    await this.conversationRepository.setActiveHelpRequest(
      conversationId, 
      helpRequest._id! as unknown as ObjectId
    );

    return helpRequest._id! as unknown as ObjectId;
  }
}