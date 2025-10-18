import type { HelpRequest } from "../../domain/entities/HelpRequest.js";
import type { GetPendingHelpRequestsUseCase } from "../../domain/use-cases/GetPendingHelpRequestsUseCase.js";
import type { ResolveHelpRequestUseCase } from "../../domain/use-cases/ResolveHelpRequestUseCase.js";

export class HelpRequestService {
  constructor(
    private getPendingRequestsUseCase: GetPendingHelpRequestsUseCase,
    private resolveHelpRequestUseCase: ResolveHelpRequestUseCase
  ) {}

  async getPendingRequests(): Promise<HelpRequest[]> {
    return this.getPendingRequestsUseCase.execute();
  }

  async resolveRequest(helpRequestId: string, response: string): Promise<void> {
    await this.resolveHelpRequestUseCase.execute(helpRequestId, response);
  }
}