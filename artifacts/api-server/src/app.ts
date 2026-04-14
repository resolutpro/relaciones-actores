import express, { type Express } from "express";
import cors from "cors";
import { randomBytes } from "crypto";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env["ALLOWED_ORIGINS"]
  ? process.env["ALLOWED_ORIGINS"].split(",").map((s) => s.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env["NODE_ENV"] !== "production") return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env["SESSION_SECRET"] ?? (() => {
  const generated = randomBytes(32).toString("hex");
  logger.warn("SESSION_SECRET not set — using ephemeral session secret. Sessions will be lost on restart. Set SESSION_SECRET in production.");
  return generated;
})();

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env["NODE_ENV"] === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

export default app;
