"use client";

import { useEffect, useState } from "react";

import Dashboard from "@/components/Dashboard";
import { useWebSocket } from "@/components/WebSocketProvider";

/** Single shared WebSocket for board, chat, paper, etc. */
export default function Home() {
  const { client, connected } = useWebSocket();

  return <Dashboard wsClient={client} wsConnected={connected} />;
}
