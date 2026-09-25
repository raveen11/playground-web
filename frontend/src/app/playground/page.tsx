"use client";

import Dashboard from "@/components/Dashboard";
import { useWebSocket } from "@/components/WebSocketProvider";

/**
 * Interactive Engineering Playground
 * Houses the live multiplayer Kanban, real-time chat, shared paper doc,
 * presence engine, and PostgreSQL workspace.
 */
export default function PlaygroundPage() {
  const { client, connected } = useWebSocket();

  return <Dashboard wsClient={client} wsConnected={connected} />;
}
