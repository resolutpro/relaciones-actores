import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import actorsRouter from "./actors.js";
import relationshipsRouter from "./relationships.js";
import exportRouter from "./export.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "No autenticado" });
}

router.use("/actors", requireAuth, actorsRouter);
router.use("/relationships", requireAuth, relationshipsRouter);
router.use("/export", requireAuth, exportRouter);

export default router;
