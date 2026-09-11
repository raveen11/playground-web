"use client";

import { useEffect } from "react";
import type { WebSocketClient } from "@/websocket";

export type RoomUser = {
  userId: string;
  name: string;
  role: string;
  userData?: any;
};

/** Single joinRoom for the shared parent connection. */
export function useRoomJoin(
  client: WebSocketClient | null,
  connected: boolean,
  user: RoomUser | null,
  boardId: string,
) {
  useEffect(() => {
    if (!client || !connected || !user || !boardId) return;

    client.joinRoom({
      boardId,
      userId: user.userId,
      name: user.name,
      role: user.role,
      userData: user
    });
  }, [client, connected, user, boardId]);
}
