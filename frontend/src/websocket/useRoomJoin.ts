"use client";

import { useEffect } from "react";
import type { WebSocketClient } from "@/websocket";

export type RoomUser = {
  userId: string;
  name: string;
  role: "viewer" | "editor" | "admin";
};

/** Single joinRoom for the shared parent connection. */
export function useRoomJoin(
  client: WebSocketClient | null,
  connected: boolean,
  user: RoomUser | null,
  boardId: string,
) {
  useEffect(() => {
    if (!client || !connected || !user) return;

    client.joinRoom({
      boardId,
      userId: user.userId,
      name: user.name,
      role: user.role,
    });
  }, [client, connected, user, boardId]);
}
