
const configProd = {
  API_URL:
    process.env.PUBLIC_API_URL ||
    "https://playground-web-i74t.onrender.com",
  WS_URL: process.env.PUBLIC_WS_URL || "wss://playground-web-i74t.onrender.com",
};

const configDev = {
  // The local server serves HTTP + WebSocket on the same port (default 3001).
  API_URL: process.env.PUBLIC_API_URL || "http://localhost:3001",
  WS_URL: process.env.PUBLIC_WS_URL || "ws://localhost:3001",
};

export const config = configProd;
// process.env.NODE_ENV === "production" ? configProd : configDev;
