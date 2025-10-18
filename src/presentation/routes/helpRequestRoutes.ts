import { Router } from "express";
import type { HelpRequestController } from "../controllers/HelpRequestController.js";

export const createHelpRequestRoutes = (controller: HelpRequestController): Router => {
  const router = Router();
  
  router.get('/help-requests', (req, res) => controller.getPendingRequests(req, res));
  router.post('/help-requests/resolve', (req, res) => controller.resolveRequest(req, res));
  
  return router;
};