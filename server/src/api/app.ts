import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { chatRouter } from "./routes/chat.routes.js";
import { documentsRouter } from "./routes/documents.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { signupRouter } from "./routes/signup.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { companyRouter } from "./routes/company.routes.js";
import { invitesRouter } from "./routes/invites.routes.js";

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
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  // Cheap liveness probe: confirms the service is up and reachable without
  // touching the database. Useful as a Render health check.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/signup", signupRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/company", companyRouter);
  app.use("/api/invites", invitesRouter);

  app.use("/api/documents", documentsRouter);
  app.use("/api/chat", chatRouter);

  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("COOKIE_SECURE:", process.env.COOKIE_SECURE);
  console.log("CORS_ORIGINS:", process.env.CORS_ORIGINS);
  console.log("ALLOWED_ORIGINS:", allowedOrigins);
  return app;
}

export const app = createApp();
