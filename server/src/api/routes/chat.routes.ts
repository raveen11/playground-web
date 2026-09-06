import { Router, type Router as ExpressRouter } from "express";
import { chatWithDocuments } from "../controllers/chat.controller.js";
import {
  listChatMessages,
  createChatMessage,
  deleteChatMessage,
} from "../controllers/chat-message.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createChatMessageSchema } from "../schemas/board.schemas.js";

export const chatRouter: ExpressRouter = Router();

// RAG document chat
chatRouter.post("/", chatWithDocuments);

// Persistent chat messages
chatRouter.get("/messages", listChatMessages);
chatRouter.post(
  "/messages",
  validateBody(createChatMessageSchema),
  createChatMessage,
);
chatRouter.delete("/messages/:messageId", deleteChatMessage);
