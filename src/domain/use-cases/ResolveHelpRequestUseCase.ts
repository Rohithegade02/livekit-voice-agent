import { HelpRequestStatus } from "../entities/Enums.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";
import type { IHelpRequestRepository  } from "../repositories/IHelpRequestRepository.js";
import type { IKnowledgeRepository } from "../repositories/IKnowledgeRepository.js";
import type { INotificationService } from "../services/INotificationService.js";

export class ResolveHelpRequestUseCase {
  constructor(
    private helpRequestRepo: IHelpRequestRepository,
    private knowledgeRepo: IKnowledgeRepository,
    private conversationRepo: IConversationRepository,
    private notificationService: INotificationService
  ) {}

  async execute(helpRequestId: string, response: string): Promise<void> {
    // Update help request
    console.log(`Resolving help request ${helpRequestId} with response: ${response}`);
    await this.helpRequestRepo.updateStatus(helpRequestId, HelpRequestStatus.RESOLVED, response);
    
    // Handle knowledge base
    const helpRequest = await this.helpRequestRepo.findById(helpRequestId);

    console.log('Fetched help request for knowledge base update:', helpRequest);
    if (!helpRequest) throw new Error('Help request not found');

    const existingEntry = await this.knowledgeRepo.findByQuestion(helpRequest.question);
    if (existingEntry) {
      await this.knowledgeRepo.updateUsage(existingEntry._id!, response);
    } else {
      await this.knowledgeRepo.create({
        question: helpRequest.question,
        answer: response,
        sourceHelpRequestId: helpRequestId,
        createdAt: new Date(),
        usageCount: 1
      });
    }

    // Activate conversation
    await this.conversationRepo.returnToActiveStatus(helpRequestId);
    
    // Notify user
    await this.notificationService.sendSupervisorResponse(helpRequest.conversationId, response);
  }
}