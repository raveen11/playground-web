import "dotenv/config";

import { httpServer } from "./infrastructure/http/server.js";
import "./realtime/websocket/server.js";

// Hosts inject the public port here. HTTP and WebSocket share it: the WS server
// runs in `noServer` mode and upgrades connections on this same listener.
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
  httpServer.listen(PORT, HOST, () => {
    console.log(`HTTP server running on http://${HOST}:${PORT}`);
    console.log(`WebSocket server accepting upgrades on the same port (${PORT})`);
  });
}

start();
