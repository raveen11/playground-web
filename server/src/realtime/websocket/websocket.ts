import type { Server } from "node:http";
import {
  WebSocketServer,
  type WebSocket,
} from "ws";
import { createRealtimeContext } from "../context.js";
import { handleMessage } from "../router.js";


export function setupWebSocket(
  httpServer: Server,
) {
  const wss = new WebSocketServer({
    noServer: true,
  });

  const context =
    createRealtimeContext();

  httpServer.on(
    "upgrade",
    (request, socket, head) => {
      wss.handleUpgrade(
        request,
        socket,
        head,
        (ws) => {
          wss.emit(
            "connection",
            ws,
            request,
          );
        },
      );
    },
  );

  wss.on(
    "connection",
    (ws: WebSocket) => {
      console.log(
        "WebSocket connected",
      );

      ws.on("message", (raw) => {
        handleMessage(
          ws,
          raw.toString(),
          context,
        );
      });

      ws.on("close", () => {
        handleDisconnect(
          ws,
          context,
        );
      });

      ws.on("error", (error) => {
        console.error(
          "WebSocket error:",
          error,
        );
      });
    },
  );

  startCleanup(context);

  return wss;
}

function handleDisconnect(
  ws: WebSocket,
  context: ReturnType<
    typeof createRealtimeContext
  >,
) {
  context.whiteboardRooms.disconnect(
    ws,
  );

  const client =
    context.rooms.findBySocket(ws);

  if (!client) {
    return;
  }

  context.rooms.leave(
    client.boardId,
    client.userId,
  );

  context.rooms.broadcast(
    client.boardId,
    {
      type: "presence:update",
      users:
        context.rooms.listPresence(
          client.boardId,
        ),
    },
  );
}

function startCleanup(
  context: ReturnType<
    typeof createRealtimeContext
  >,
) {
  setInterval(() => {
    context.rooms.pruneStale(
      20_000,
    );
  }, 10_000);
}