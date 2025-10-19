import { type Db, ObjectId } from "mongodb";
import type { IHelpRequestRepository } from "../../../domain/repositories/IHelpRequestRepository.js";
import type { HelpRequest } from "../../../domain/entities/HelpRequest.js";
import { HelpRequestStatus } from "../../../domain/entities/Enums.js";


export class HelpRequestRepository implements IHelpRequestRepository {
  constructor(private db: Db) {}

  // Helper to convert MongoDB document to HelpRequest
  private toHelpRequest(doc: any): HelpRequest {
    return {
      conversationId: doc.conversationId,
      question: doc.question,
      createdAt: doc.createdAt,
      status: doc.status,
      supervisorResponse: doc.supervisorResponse,
      _id: doc._id.toString(), // convert ObjectId to string if needed
    };
  }

  async findPendingRequests(): Promise<HelpRequest[]> {
    const docs = await this.db
      .collection("help_requests")
      .find({ status: HelpRequestStatus.PENDING })
      .sort({ createdAt: -1 })
      .toArray();

    return docs.map(this.toHelpRequest);
  }

  async findById(id: string): Promise<HelpRequest | null> {
    const doc = await this.db
      .collection("help_requests")
      .findOne({ _id: new ObjectId(id)  });

    if (!doc) return null;
    return this.toHelpRequest(doc);
  }
   async findExpiredRequests(timeoutAgo: Date): Promise<HelpRequest[]> {
    return this.db.collection<HelpRequest>('help_requests')
      .find({
        status: HelpRequestStatus.PENDING,
        createdAt: { $lt: timeoutAgo }
      })
      .toArray();
  }

  async updateStatus(
    id: string ,
    status: HelpRequestStatus,
    response?: string
  ): Promise<void> {
    console.log(`Updating help request ${id} to status ${status} with response: ${response}`);
    const updateData: any = { status, resolvedAt: new Date() };
    if (response) {
      updateData.supervisorResponse = response;
    }

    await this.db.collection<HelpRequest>("help_requests").updateOne(
      { _id: new ObjectId(id) as any},
      { $set: updateData }
    );
  }

   async create(helpRequest: Omit<HelpRequest, '_id'>): Promise<HelpRequest> {
    const result = await this.db.collection<HelpRequest>('help_requests').insertOne(helpRequest);
    console.log(`📩 Supervisor ping: Hey, I need help answering "${helpRequest.question}"`);
    return { ...helpRequest, _id: result.insertedId };
  }
  
}
