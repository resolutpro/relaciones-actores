import { Router, type Request, type Response } from "express";
import { actorQueries, relationshipQueries } from "../db.js";

const router = Router();

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
}

router.get("/", (_req: Request, res: Response) => {
  const actors = actorQueries.findAll();
  res.json(actors);
});

router.post("/", (req: Request, res: Response) => {
  const body = req.body as {
    name?: string;
    sector?: string | null;
    lat?: number | null;
    lon?: number | null;
    custom_fields?: Record<string, string>;
  };

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    res.status(400).json({ error: "El nombre es obligatorio" });
    return;
  }

  const actor = actorQueries.create({
    name: body.name.trim(),
    sector: body.sector ?? null,
    lat: body.lat != null ? Number(body.lat) : null,
    lon: body.lon != null ? Number(body.lon) : null,
    custom_fields: body.custom_fields || {},
  });

  res.status(201).json(actor);
});

router.get("/:id", (req: Request, res: Response) => {
  const id = parseInt(getParam(req, "id"), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const actor = actorQueries.findById(id);
  if (!actor) {
    res.status(404).json({ error: "Actor no encontrado" });
    return;
  }
  res.json(actor);
});

router.put("/:id", (req: Request, res: Response) => {
  const id = parseInt(getParam(req, "id"), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const body = req.body as {
    name?: string;
    sector?: string | null;
    lat?: number | null;
    lon?: number | null;
    custom_fields?: Record<string, string>;
  };

  const updated = actorQueries.update(id, {
    name: body.name,
    sector: body.sector !== undefined ? body.sector : undefined,
    lat: body.lat != null ? Number(body.lat) : body.lat,
    lon: body.lon != null ? Number(body.lon) : body.lon,
    custom_fields: body.custom_fields,
  });

  if (!updated) {
    res.status(404).json({ error: "Actor no encontrado" });
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
  const deleted = actorQueries.delete(id);
  if (!deleted) {
    res.status(404).json({ error: "Actor no encontrado" });
    return;
  }
  res.status(204).end();
});

router.get("/:id/relationships", (req: Request, res: Response) => {
  const id = parseInt(getParam(req, "id"), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const actor = actorQueries.findById(id);
  if (!actor) {
    res.status(404).json({ error: "Actor no encontrado" });
    return;
  }
  const related = relationshipQueries.findByActor(id);
  res.json(related);
});

export default router;
