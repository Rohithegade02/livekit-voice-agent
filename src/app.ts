import express from 'express';
import cors from 'cors';
import { getDb } from '../config/db.js';
import { createHelpRequestRoutes } from './presentation/routes/helpRequestRoutes.js';
import { createKnowledgeRoutes } from './presentation/routes/knowledgeRoutes.js';
import { setupDependencies } from './di-container.js';

export class Application {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors({
      origin: 'http://localhost:3000',
      credentials: true
    }));
    this.app.use(express.json());
  }

  private async setupRoutes(): Promise<void> {
    const db = await getDb();
    const dependencies = setupDependencies(db);

    this.app.use('/api', createHelpRequestRoutes(dependencies.helpRequestController));
    this.app.use('/api', createKnowledgeRoutes(dependencies.knowledgeController));
  }

  public start(port: number): void {
    this.app.listen(port, () => {
      console.log(`🚀 Supervisor API server running on port ${port}`);
    });
  }
}