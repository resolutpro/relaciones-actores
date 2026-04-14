import { Router, type Request, type Response } from "express";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    username: string;
  }
}

const router = Router();

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  const adminUser = process.env["ADMIN_USER"] || "admin";
  const adminPass = process.env["ADMIN_PASS"] || "admin";

  if (username === adminUser && password === adminPass) {
    req.session.authenticated = true;
    req.session.username = username;
    res.json({ ok: true, username });
  } else {
    res.status(401).json({ error: "Credenciales incorrectas" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/me", (req: Request, res: Response) => {
  if (req.session.authenticated) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
