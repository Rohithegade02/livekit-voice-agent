import type { Request, Response } from 'express';
import type { HelpRequestService } from "../../application/services/HelpRequestService.js";

export class HelpRequestController {
  constructor(private helpRequestService: HelpRequestService) {}

  async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const requests = await this.helpRequestService.getPendingRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch help requests' });
    }
  }

  async resolveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { helpRequestId, response } = req.body;
      await this.helpRequestService.resolveRequest(helpRequestId, response);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve help request' });
    }
  }
}