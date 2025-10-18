import type { Request, Response } from 'express';
import type { KnowledgeService } from "../../application/services/KnowledgeService.js";
import { ObjectId } from 'mongodb';

export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  async getEntries(req: Request, res: Response): Promise<void> {
    try {
      const entries = await this.knowledgeService.getEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch knowledge base' });
    }
  }

  async deleteEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.knowledgeService.deleteEntry(new ObjectId(id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete knowledge entry' });
    }
  }
}