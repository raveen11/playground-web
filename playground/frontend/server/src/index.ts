import "dotenv/config";

import { httpServer } from "./infrastructure/http/server.js";
import "./realtime/websocket/server.js";

const PORT = Number(process.env.PORT ?? 3001);
const WS_PORT = Number(process.env.WS_PORT ?? 3002);

async function start() {
  httpServer.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
  });
}

start();
