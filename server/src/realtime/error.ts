import type { WebSocket } from "ws";
import type { ErrorMsg } from "@kanban/shared";

export function sendError(
  ws: WebSocket,
  message: string,
  code?: string,
) {
  const payload: ErrorMsg = {
    type: "error",
    message,
    code,
  };

  ws.send(JSON.stringify(payload));
}