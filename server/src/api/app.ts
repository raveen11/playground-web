import express, { type Express } from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat.routes.js";
import { documentsRouter } from "./routes/documents.routes.js";

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3003",
  "https://playgroundweb.vercel.app",
];

// Extra origins (Vercel preview deployments, custom domains) can be added
// without a code change via a comma-separated CORS_ORIGINS env var.
export const allowedOrigins = [
  ...new Set([
    ...DEFAULT_ORIGINS,
    ...(process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
];

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: allowedOrigins,
    }),
  );
  app.use(express.json());

  // Cheap liveness probe: confirms the service is up and reachable without
  // touching the database. Useful as a Render health check.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/documents", documentsRouter);
  app.use("/api/chat", chatRouter);

  return app;
}

export const app = createApp();
