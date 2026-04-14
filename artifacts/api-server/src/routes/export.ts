import { Router, type Request, type Response } from "express";
import { actorQueries, relationshipQueries } from "../db.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const actors = actorQueries.findAll();
  const relationships = relationshipQueries.findAll();

  const exportData = {
    exportedAt: new Date().toISOString(),
    actors,
    relationships,
  };

  res.setHeader("Content-Disposition", "attachment; filename=export.json");
  res.setHeader("Content-Type", "application/json");
  res.json(exportData);
});

export default router;
