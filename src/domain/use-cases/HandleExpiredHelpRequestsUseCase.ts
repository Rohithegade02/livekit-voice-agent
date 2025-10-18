import type { IHelpRequestRepository } from "../repositories/IHelpRequestRepository.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";
import { HelpRequestStatus } from "../entities/Enums.js";

export class HandleExpiredHelpRequestsUseCase {
  constructor(
    private helpRequestRepository: IHelpRequestRepository,
    private conversationRepository: IConversationRepository
  ) {}

  async execute(timeoutMinutes: number = 30): Promise<number> {
    const timeoutAgo = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    
    // Get expired requests
    const expiredRequests = await this.helpRequestRepository.findExpiredRequests(timeoutAgo);
    
    let processedCount = 0;

    for (const request of expiredRequests) {
      // Mark help request as unresolved
      await this.helpRequestRepository.updateStatus(
        request._id!, 
        HelpRequestStatus.UNRESOLVED,
        'Auto-expired: No supervisor response within timeout period'
      );

      // Update conversation status back to active
      await this.conversationRepository.activateConversation(request._id!);
      
      processedCount++;
    }

    return processedCount;
  }
}