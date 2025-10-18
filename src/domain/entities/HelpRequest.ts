import type { ObjectId } from "mongodb";
import type { HelpRequestStatus } from "./Enums.js";

export interface HelpRequest {
  _id?: ObjectId;
  conversationId: string;
  question: string;
  createdAt: Date;
  resolvedAt?: Date;
  status: HelpRequestStatus;
  supervisorResponse?: string;
  knowledgeBaseEntryId?: string;
}
