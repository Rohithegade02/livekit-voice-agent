import type { HandleExpiredHelpRequestsUseCase } from "../../domain/use-cases/HandleExpiredHelpRequestsUseCase.js";

export class TimeoutService {
  constructor(
    private handleExpiredHelpRequestsUseCase: HandleExpiredHelpRequestsUseCase
  ) {}

  async handleExpiredRequests(timeoutMinutes: number = 30): Promise<number> {
    return this.handleExpiredHelpRequestsUseCase.execute(timeoutMinutes);
  }

}