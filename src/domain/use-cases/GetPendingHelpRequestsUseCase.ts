import type { HelpRequest } from "../entities/HelpRequest.js";
import type { IHelpRequestRepository } from "../repositories/IHelpRequestRepository.js";

export class GetPendingHelpRequestsUseCase {
  constructor(private helpRequestRepo: IHelpRequestRepository) {}
  
  async execute(): Promise<HelpRequest[]> {
    return this.helpRequestRepo.findPendingRequests();
  }
}
