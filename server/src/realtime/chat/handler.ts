import type { WebSocket } from "ws";

import type { RealtimeContext } from "../context.js";
import { sendError } from "../error.js";

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
  if (
    typeof input !== "object" ||
    input === null
  ) {
    sendError(
      ws,
      "Invalid chat message.",
      "invalid_message",
    );
    return;
  }

  if (
    !("type" in input) ||
    typeof input.type !== "string"
  ) {
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
      sendError(
        ws,
        "Unsupported chat message.",
        "unsupported_type",
      );
  }
}

function getClient(
  ws: WebSocket,
  context: RealtimeContext,
) {
  return context.rooms.findBySocket(ws);
}

function handleMessage(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  const data = input as Partial<ChatMessageInput>;

  const text =
    typeof data.text === "string"
      ? data.text.trim()
      : "";

  if (!text) {
    sendError(
      ws,
      "Message cannot be empty.",
      "empty_message",
    );
    return;
  }

  const message = {
    id: crypto.randomUUID(),
    userId: client.userId,
    name: client.name,
    color: client.color,
    text,
    sentAt:
      typeof data.sentAt === "string"
        ? data.sentAt
        : new Date().toISOString(),
  };

  context.boardState.addChatMessage(
    client.boardId,
    message,
  );

  context.rooms.broadcast(
    client.boardId,
    {
      type: "chat:message",
      ...message,
    },
  );
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

  context.rooms.broadcast(
    client.boardId,
    {
      type: "chat:typing",
      userId: client.userId,
      name: client.name,
      isTyping: Boolean(data.isTyping),
    },
  );
}