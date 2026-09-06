import type { WebSocket } from "ws";
import type { RealtimeContext } from "../context.js";
import { sendError } from "../error.js";
import { prisma } from "../../lib/prisma.js";
import { chatService } from "../../services/chat.service.js";
import { resolveUserId } from "../../lib/auth/company-scope.js";

type ChatMessageInput = {
  boardId: string;
  text: string;
  sentAt: string;
};

type TypingInput = {
  isTyping: boolean;
};

export function handleChatMessage(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  if (typeof input !== "object" || input === null) {
    sendError(ws, "Invalid chat message.", "invalid_message");
    return;
  }

  if (!("type" in input) || typeof input.type !== "string") {
    return;
  }

  switch (input.type) {
    case "chat:message":
      handleMessage(ws, input, context);
      return;

    case "chat:typing":
      handleTyping(ws, input, context);
      return;

    default:
      sendError(ws, "Unsupported chat message.", "unsupported_type");
  }
}

function getClient(ws: WebSocket, context: RealtimeContext) {
  return context.rooms.findBySocket(ws);
}

async function handleMessage(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);

  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  const data = input as Partial<ChatMessageInput>;

  const text = typeof data.text === "string" ? data.text.trim() : "";

  if (!text) {
    sendError(ws, "Message cannot be empty.", "empty_message");
    return;
  }

  let messageId: string = crypto.randomUUID();
  const sentAt =
    typeof data.sentAt === "string" ? data.sentAt : new Date().toISOString();

  try {
    const defaultCompany = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (defaultCompany) {
      const senderId = await resolveUserId(
        { user: undefined } as any,
        defaultCompany.id,
      );
      const isBoardUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          client.boardId,
        );

      const dbMessage = await chatService.createMessage(
        defaultCompany.id,
        senderId,
        {
          content: text,
          boardId: isBoardUuid ? client.boardId : undefined,
        },
      );
      messageId = dbMessage.id;
    }
  } catch (error) {
    console.error("handleChatMessage DB persist error:", error);
  }

  const message = {
    id: messageId,
    userId: client.userId,
    name: client.name,
    color: client.color,
    text,
    sentAt,
  };

  context.boardState.addChatMessage(client.boardId, message);

  context.rooms.broadcast(client.boardId, {
    type: "chat:message",
    ...message,
  });
}

function handleTyping(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);

  if (!client) {
    return;
  }

  const data = input as Partial<TypingInput>;

  context.rooms.broadcast(client.boardId, {
    type: "chat:typing",
    userId: client.userId,
    name: client.name,
    isTyping: Boolean(data.isTyping),
  });
}