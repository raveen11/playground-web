import type { WebSocket } from "ws";

import {
  WhiteboardJoinMsg,
  WhiteboardLeaveMsg,
  WhiteboardOperationMsg,
} from "@kanban/shared";

import type { RealtimeContext } from "../context.js";
import { sendError } from "../error.js";

export function handleWhiteboardMessage(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  if (
    typeof input !== "object" ||
    input === null ||
    !("type" in input)
  ) {
    sendError(
      ws,
      "Invalid whiteboard message.",
      "invalid_message",
    );
    return;
  }

  const type = input.type;

  switch (type) {
    case "whiteboard:join":
      return handleJoin(ws, input, context);

    case "whiteboard:leave":
      return handleLeave(ws, input, context);

    case "whiteboard:operation":
      return handleOperation(ws, input, context);

    default:
      sendError(
        ws,
        "Unsupported whiteboard message.",
        "unsupported_type",
      );
  }
}

function handleJoin(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  const result =
    WhiteboardJoinMsg.safeParse(input);

  if (!result.success) {
    sendError(
      ws,
      "Invalid whiteboard join message.",
      "invalid_whiteboard_join",
    );
    return;
  }

  const data = result.data;

  context.whiteboardRooms.join(
    ws,
    data.whiteboardId,
    data.userId,
  );

  const document =
    context.whiteboard.getDocument(
      data.whiteboardId,
      data.userId,
    );

  const currentVersion =
    context.whiteboard.getVersion(
      data.whiteboardId,
    );

  if (
    data.lastVersion === 0 ||
    data.lastVersion > currentVersion ||
    !context.whiteboard.canReplayFrom(
      data.whiteboardId,
      data.lastVersion,
    )
  ) {
    ws.send(
      JSON.stringify({
        type: "document.snapshot",
        document,
      }),
    );

    return;
  }

  ws.send(
    JSON.stringify({
      type: "whiteboard:sync",
      whiteboardId: data.whiteboardId,
      operations:
        context.whiteboard.getOperationsSince(
          data.whiteboardId,
          data.lastVersion,
        ),
    }),
  );
}

function handleLeave(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  const result =
    WhiteboardLeaveMsg.safeParse(input);

  if (!result.success) {
    sendError(
      ws,
      "Invalid whiteboard leave message.",
      "invalid_whiteboard_leave",
    );
    return;
  }

  context.whiteboardRooms.leave(
    ws,
    result.data.whiteboardId,
  );
}

function handleOperation(
  ws: WebSocket,
  input: unknown,
  context: RealtimeContext,
) {
  const result =
    WhiteboardOperationMsg.safeParse(input);

  if (!result.success) {
    sendError(
      ws,
      "Invalid whiteboard operation.",
      "invalid_whiteboard_operation",
    );
    return;
  }

  const envelope = result.data.operation;

  const membership =
    context.whiteboardRooms.getMembership(ws);

  if (
    !membership ||
    membership.whiteboardId !==
      envelope.documentId
  ) {
    sendError(
      ws,
      "Join the whiteboard before sending operations.",
      "whiteboard_not_joined",
    );
    return;
  }

  if (
    membership.userId !== envelope.userId
  ) {
    sendError(
      ws,
      "Operation user does not match the joined user.",
      "whiteboard_user_mismatch",
    );
    return;
  }

  try {
    const operation =
      context.whiteboard.applyOperation(
        envelope.documentId,
        envelope,
      );

    if (!operation) {
      sendError(
        ws,
        "Failed to apply operation.",
        "operation_failed",
      );
      return;
    }

    const message = JSON.stringify({
      type: "operation",
      operation,
    });

    const clients =
      context.whiteboardRooms.getClients(
        envelope.documentId,
      );

    for (const client of clients) {
      if (
        client.readyState === client.OPEN
      ) {
        client.send(message);
      }
    }
  } catch (error) {
    console.error(
      "Whiteboard operation failed:",
      error,
    );

    sendError(
      ws,
      "Invalid operation.",
      "invalid_operation",
    );
  }
}