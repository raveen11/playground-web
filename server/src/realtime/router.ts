import type { WebSocket } from "ws";

import type { RealtimeContext } from "./context.js";
import { sendError } from "./error.js";
import { handleChatMessage } from "./chat/handler.js";
import { handleWhiteboardMessage } from "./whiteboard/handler.js";
import { handleBoardMessage } from "./board/handler.js";

export function handleMessage(
  ws: WebSocket,
  raw: string,
  context: RealtimeContext,
) {
  let input: unknown;

  try {
    input = JSON.parse(raw);
  } catch {
    sendError(
      ws,
      "Invalid JSON payload.",
      "invalid_json",
    );
    return;
  }

  if (
    typeof input !== "object" ||
    input === null ||
    !("type" in input) ||
    typeof input.type !== "string"
  ) {
    sendError(
      ws,
      "Message must contain a type.",
      "invalid_message",
    );
    return;
  }
  switch (input.type) {
    case "chat:message":
    case "chat:typing":
      return handleChatMessage(
        ws,
        input,
        context,
      );

    case "whiteboard:join":
    case "whiteboard:leave":
    case "whiteboard:operation":
      return handleWhiteboardMessage(
        ws,
        input,
        context,
      );

    default:
      return handleBoardMessage(
        ws,
        input,
        context,
      );
  }
}