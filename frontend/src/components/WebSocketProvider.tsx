"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { config } from "../../config";
import { WebSocketClient } from "@/websocket";

interface WebSocketContextType {
  client: WebSocketClient | null;
  connected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  client: null,
  connected: false,
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
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

  return (
    <WebSocketContext.Provider value={{ client, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
