import { Router, type Request, type Response } from "express";
import { relationshipQueries, actorQueries } from "../db.js";

const router = Router();

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
}

router.get("/", (_req: Request, res: Response) => {
  const relationships = relationshipQueries.findAll();
  res.json(relationships);
});

router.post("/", (req: Request, res: Response) => {
  const body = req.body as {
    source_actor_id?: number;
    target_actor_id?: number;
    score?: number;
    comments?: string | null;
  };

  if (!body.source_actor_id || !body.target_actor_id) {
    res.status(400).json({ error: "Los actores origen y destino son obligatorios" });
    return;
  }

  const sourceId = Number(body.source_actor_id);
  const targetId = Number(body.target_actor_id);

  if (isNaN(sourceId) || isNaN(targetId)) {
    res.status(400).json({ error: "IDs de actor inválidos" });
    return;
  }

  if (sourceId === targetId) {
    res.status(400).json({ error: "No se puede crear una relación de un actor consigo mismo" });
    return;
  }

  if (!actorQueries.findById(sourceId)) {
    res.status(404).json({ error: "Actor origen no encontrado" });
    return;
  }

  if (!actorQueries.findById(targetId)) {
    res.status(404).json({ error: "Actor destino no encontrado" });
    return;
  }

  const score = body.score != null ? Number(body.score) : 0;
  if (isNaN(score) || score < 0 || score > 1) {
    res.status(400).json({ error: "El score debe ser un número entre 0 y 1" });
    return;
  }

  const relationship = relationshipQueries.create({
    source_actor_id: sourceId,
    target_actor_id: targetId,
    score,
    comments: body.comments ?? null,
  });

  res.status(201).json(relationship);
});

router.get("/:id", (req: Request, res: Response) => {
  const id = parseInt(getParam(req, "id"), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const relationship = relationshipQueries.findById(id);
  if (!relationship) {
    res.status(404).json({ error: "Relación no encontrada" });
    return;
  }
  res.json(relationship);
});

router.put("/:id", (req: Request, res: Response) => {
  const id = parseInt(getParam(req, "id"), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const body = req.body as {
    source_actor_id?: number;
    target_actor_id?: number;
    score?: number;
    comments?: string | null;
  };

  if (body.score != null) {
    const score = Number(body.score);
    if (isNaN(score) || score < 0 || score > 1) {
      res.status(400).json({ error: "El score debe ser un número entre 0 y 1" });
      return;
    }
  }

  const updated = relationshipQueries.update(id, {
    source_actor_id: body.source_actor_id ? Number(body.source_actor_id) : undefined,
    target_actor_id: body.target_actor_id ? Number(body.target_actor_id) : undefined,
    score: body.score != null ? Number(body.score) : undefined,
    comments: body.comments !== undefined ? body.comments : undefined,
  });

  if (!updated) {
    res.status(404).json({ error: "Relación no encontrada" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", (req: Request, res: Response) => {
  const id = parseInt(getParam(req, "id"), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const deleted = relationshipQueries.delete(id);
  if (!deleted) {
    res.status(404).json({ error: "Relación no encontrada" });
    return;
  }
  res.status(204).end();
});

export default router;
