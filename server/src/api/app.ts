import express, { type Express } from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat.routes.js";
import { documentsRouter } from "./routes/documents.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: [
      "http://localhost:3000",
      "https://playgroundweb.vercel.app",
    ],
    }),
  );
  app.use(express.json());

  app.use("/api/documents", documentsRouter);
  app.use("/api/chat", chatRouter);

  return app;
}

export const app = createApp();
