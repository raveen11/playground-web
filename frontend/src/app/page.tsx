"use client";

import { useEffect, useState } from "react";

import Dashboard from "@/components/Dashboard";
import { config } from "../../config";
import { WebSocketClient } from "@/websocket";

/** Single shared WebSocket for board, chat, paper, etc. */
export default function Home() {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocketClient(config.WS_URL);
    setClient(ws);

    const unsubs = [
      ws.onConnection("open", () => setConnected(true)),
      ws.onConnection("close", () => setConnected(false)),
      ws.onConnection("error", () => setConnected(false)),
    ];

    ws.connect().catch((error) => {
      console.error("[WS] Connection failed:", error);
      setConnected(false);
    });

    return () => {
      unsubs.forEach((u) => u());
      ws.close();
      setClient(null);
      setConnected(false);
    };
  }, []);

  return <Dashboard wsClient={client} wsConnected={connected} />;
}
