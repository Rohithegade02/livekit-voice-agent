import type { Db } from "mongodb";
import { HelpRequestRepository } from "./application/infrastructure/database/repositories/HelpRequestRepository.js";
import { KnowledgeRepository } from "./application/infrastructure/database/repositories/KnowledgeService.js";
import { LiveKitNotificationService } from "./application/infrastructure/livekit/LiveKitNotificationService.js";
import { HelpRequestService } from "./application/services/HelpRequestService.js";
import { KnowledgeService } from "./application/services/KnowledgeService.js";
import { GetPendingHelpRequestsUseCase } from "./domain/use-cases/GetPendingHelpRequestsUseCase.js";
import { ManageKnowledgeUseCase } from "./domain/use-cases/ManageKnowledgeUseCase.js";
import { ResolveHelpRequestUseCase } from "./domain/use-cases/ResolveHelpRequestUseCase.js";
import { HelpRequestController } from "./presentation/controllers/HelpRequestController.js";
import { KnowledgeController } from "./presentation/controllers/KnowledgeController.js";
import { ConversationRepository } from "./application/infrastructure/database/repositories/ConversationRepository.js";
import { ConversationService } from "./application/services/ConversationService.js";
import { EscalateToSupervisorUseCase } from "./domain/use-cases/EscalateToSupervisorUseCase.js";
import { EscalationService } from "./application/services/EscalationService.js";
import { LiveKitEscalationHandler } from "./application/infrastructure/livekit/LiveKitEscalationHandler.js";

export function setupDependencies(db: Db) {
  // Repositories
  const helpRequestRepo = new HelpRequestRepository(db);
  const knowledgeRepo = new KnowledgeRepository(db);
  const conversationRepo = new ConversationRepository(db);
  
  // Services
  const notificationService = new LiveKitNotificationService();
  
  // Use Cases
  const getPendingRequestsUseCase = new GetPendingHelpRequestsUseCase(helpRequestRepo);
  const resolveHelpRequestUseCase = new ResolveHelpRequestUseCase(
    helpRequestRepo,
    knowledgeRepo,
    conversationRepo,
    notificationService
  );
  const manageKnowledgeUseCase = new ManageKnowledgeUseCase(knowledgeRepo);
   const escalateToSupervisorUseCase = new EscalateToSupervisorUseCase(
    helpRequestRepo,
    conversationRepo
  );
  
  // Application Services
  const helpRequestService = new HelpRequestService(
    getPendingRequestsUseCase,
    resolveHelpRequestUseCase
  );
  const knowledgeService = new KnowledgeService(manageKnowledgeUseCase);
  const conversationService = new ConversationService(conversationRepo);
  const escalationService = new EscalationService(escalateToSupervisorUseCase);

  
  // Controllers
  const helpRequestController = new HelpRequestController(helpRequestService);
  const knowledgeController = new KnowledgeController(knowledgeService);
  
  // Infrastructure
  const liveKitEscalationHandler = new LiveKitEscalationHandler(escalationService);


  return {
    helpRequestController,
    knowledgeController,
    conversationService,
    liveKitEscalationHandler,
    escalationService,
    knowledgeService
  };
}