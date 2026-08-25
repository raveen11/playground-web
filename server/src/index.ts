import "dotenv/config";

import { httpServer } from "./infrastructure/http/server.js";
import { setupWebSocket } from "./realtime/websocket/websocket.js";

const PORT = Number(
  process.env.PORT ?? 3001,
);

const HOST =
  process.env.HOST ?? "0.0.0.0";

setupWebSocket(httpServer);

httpServer.listen(
  PORT,
  HOST,
  () => {
    console.log(
      `HTTP + WebSocket server running on ${HOST}:${PORT}`,
    );
  },
);