import type { HelpRequest } from "../entities/HelpRequest.js";
import { HelpRequestStatus } from "../entities/Enums.js";

export interface IHelpRequestRepository {
  findPendingRequests(): Promise<HelpRequest[]>;
  findById(id: string): Promise<HelpRequest | null>;
  updateStatus(id: string, status: HelpRequestStatus, response?: string): Promise<void>;
  create(helpRequest: Omit<HelpRequest, '_id'>): Promise<HelpRequest>;
  findExpiredRequests(timeoutAgo: Date): Promise<HelpRequest[]>; 
}