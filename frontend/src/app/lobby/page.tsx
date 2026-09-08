"use client";

import React, { useEffect, useState, useRef } from "react";
import type { PresenceUser } from "@kanban/shared";
import { WebSocketClient } from "@/websocket";
import { config } from "../../../config";
import { api, type UserWithCards, type WrestlerData } from "@/lib/apiClient";
import RoundTableLobby from "@/components/lobby/RoundTableLobby";

export default function LobbyPage() {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [dbUsers, setDbUsers] = useState<UserWithCards[]>([]);
  const [wrestlers, setWrestlers] = useState<WrestlerData[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: "viewer" | "editor" | "admin";
  } | null>(null);
  const [guestName, setGuestName] = useState<string>("");
  const hasJoinedRef = useRef(false);

  // 1. Load authenticated user or setup guest identifier
  useEffect(() => {
    async function initUser() {
      try {
        const meRes = await api.auth.me();
        if (meRes?.user) {
          setCurrentUser({
            id: meRes.user.id,
            name: meRes.user.name,
            role:
              meRes.user.role === "company_admin" ||
                meRes.user.role === "super_admin"
                ? "admin"
                : "editor",
          });
          return;
        }
      } catch {
        // Not authenticated, fallback to guest
      }

      // Generate memorable guest name if not authenticated
      const savedGuest = sessionStorage.getItem("lobby_guest_name");
      const savedGuestId = sessionStorage.getItem("lobby_guest_id");
      const name =
        savedGuest ||
        `Challenger #${Math.floor(100 + Math.random() * 900)}`;
      const id = savedGuestId || crypto.randomUUID();

      sessionStorage.setItem("lobby_guest_name", name);
      sessionStorage.setItem("lobby_guest_id", id);
      setGuestName(name);

      setCurrentUser({
        id,
        name,
        role: "editor",
      });
    }

    initUser();
  }, []);

  // 2. Fetch DB Users with cardList & available wrestlers
  useEffect(() => {
    async function loadData() {
      try {
        const usersList = await api.wrestling.getUsers();
        setDbUsers(usersList);
      } catch (err) {
        console.error("Failed to load users with cards:", err);
      }

      try {
        const wrestlersList = await api.wrestling.getWrestlers();
        setWrestlers(wrestlersList);
      } catch (err) {
        console.error("Failed to load wrestlers:", err);
      }
    }

    loadData();
  }, []);

  // 3. Connect to WebSocket & join "lobby" room
  useEffect(() => {
    const ws = new WebSocketClient(config.WS_URL);
    setClient(ws);

    const unsubs = [
      ws.onConnection("open", () => {
        console.log("[Lobby] WS Connected");
        setConnected(true);
      }),
      ws.onConnection("close", () => {
        console.log("[Lobby] WS Disconnected");
        setConnected(false);
        hasJoinedRef.current = false;
      }),
      ws.onConnection("error", () => {
        setConnected(false);
        hasJoinedRef.current = false;
      }),
      ws.on("presence:update", (msg) => {
        console.log("[Lobby] presence:update received:", msg.users);
        setPresenceUsers(msg.users);
      }),
    ];

    ws.connect().catch((error) => {
      console.error("[Lobby] WS Connection failed:", error);
      setConnected(false);
    });

    return () => {
      unsubs.forEach((u) => u());
      ws.close();
      setClient(null);
      setConnected(false);
      hasJoinedRef.current = false;
    };
  }, []);

  // 4. Send room:join for "lobby" once connected and user is initialized
  useEffect(() => {
    if (!client || !connected || !currentUser) return;

    console.log("[Lobby] Joining lobby room as:", currentUser.name);
    client.joinRoom({
      boardId: "lobby",
      userId: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      cardCount: 20,
    });
    hasJoinedRef.current = true;
  }, [client, connected, currentUser]);

  console.log('ABCD-presenceUsers', presenceUsers, dbUsers)

  return (
    <RoundTableLobby
      connectedUsers={presenceUsers}
      currentUserId={currentUser?.id}
      currentUserName={currentUser?.name || guestName}
      dbUsers={dbUsers}
      wrestlers={wrestlers}
      wsConnected={connected}
    />
  );
}
