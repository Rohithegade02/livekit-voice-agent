import  { Router } from "express";
import type { KnowledgeController } from "../controllers/KnowledgeController.js";

export const createKnowledgeRoutes = (controller: KnowledgeController): Router => {
  const router = Router();
  
  router.get('/knowledge', (req, res) => controller.getEntries(req, res));
  router.delete('/knowledge/:id', (req, res) => controller.deleteEntry(req, res));
  
  return router;
};