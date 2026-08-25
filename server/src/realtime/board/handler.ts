import type { WebSocket } from "ws";

import { InboundMessage } from "@kanban/shared";

import type { RealtimeContext } from "../context.js";
import { sendError } from "../error.js";
import {
  handleCardCreate,
  handleCardDelete,
  handleCardMove,
  handleCardUpdate,
  handleCursorMove,
  handleHeartbeat,
  handleJoinMessage,
  handlePaperData,
  handleRequestSync,
} from "./helper.js";

export function handleBoardMessage(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  const result =
    InboundMessage.safeParse(input);

  if (!result.success) {
    sendError(
      ws,
      "Invalid board message.",
      "invalid_message",
    );
    return;
  }

  switch (result.data.type) {
    case "room:join":
      return handleJoinMessage(
        ws,
        result.data,
        context,
      );

    case "heartbeat":
      return handleHeartbeat(
        ws,
        context,
      );

    case "sync:request":
      return handleRequestSync(
        ws,
        result.data,
        context,
      );

    case "cursor:move":
      return handleCursorMove(
        ws,
        result.data,
        context,
      );

    case "card:move":
      return handleCardMove(
        ws,
        result.data,
        context,
      );

    case "card:create":
      return handleCardCreate(
        ws,
        result.data,
        context,
      );

    case "card:update":
      return handleCardUpdate(
        ws,
        result.data,
        context,
      );

    case "card:delete":
      return handleCardDelete(
        ws,
        result.data,
        context,
      );

    case "data:paper":
      return handlePaperData(
        ws,
        result.data,
        context,
      );

    default:
      sendError(
        ws,
        "Unsupported board message.",
        "unsupported_type",
      );
  }
}