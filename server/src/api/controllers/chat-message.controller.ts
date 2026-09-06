import type { RequestHandler } from "express";
import { chatService } from "../../services/chat.service.js";
import {
  resolveCompanyId,
  resolveUserId,
} from "../../lib/auth/company-scope.js";
import { broadcastToBoard } from "../../realtime/context.js";
import { paramStr } from "../../lib/params.js";

export const listChatMessages: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const boardId = req.query.boardId as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 100;

    const messages = await chatService.listMessages(companyId, boardId, limit);
    res.json(messages);
  } catch (error) {
    console.error("List chat messages failed:", error);
    res.status(500).json({ message: "Failed to list chat messages" });
  }
};

export const createChatMessage: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const senderId = await resolveUserId(req, companyId);
    const { content, boardId } = req.body;

    const message = await chatService.createMessage(companyId, senderId, {
      content,
      boardId,
    });

    if (boardId) {
      broadcastToBoard(boardId, {
        type: "chat:message",
        ...message,
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Create chat message failed:", error);
    res.status(500).json({ message: "Failed to create chat message" });
  }
};

export const deleteChatMessage: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const messageId = paramStr(req.params.messageId);
    await chatService.deleteMessage(messageId, companyId, req.user?.userId);
    res.json({ message: "Message deleted successfully", id: messageId });
  } catch (error) {
    console.error("Delete chat message failed:", error);
    res.status(500).json({ message: "Failed to delete chat message" });
  }
};
