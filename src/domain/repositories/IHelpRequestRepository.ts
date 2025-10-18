import type { HelpRequest } from "../entities/HelpRequest.js";
import { HelpRequestStatus } from "../entities/Enums.js";
import type { ObjectId } from "mongodb";

export interface IHelpRequestRepository {
  findPendingRequests(): Promise<HelpRequest[]>;
  findById(id: ObjectId): Promise<HelpRequest | null>;
  updateStatus(id: ObjectId, status: HelpRequestStatus, response?: string): Promise<void>;
  create(helpRequest: Omit<HelpRequest, '_id'>): Promise<HelpRequest>;
}