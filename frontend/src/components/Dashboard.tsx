"use client";

import { useEffect, useState } from "react";
import type { PresenceUser } from "@kanban/shared";

import Board from "@/components/board/Board";
import ChatPanel from "@/components/chat/ChatPanel";
import PaperDoc from "@/components/paper/PaperDoc";
import type { ChatMessage, WebSocketClient } from "@/websocket";
import { useRoomJoin } from "@/websocket/useRoomJoin";

type Role = "viewer" | "editor" | "admin";

type User = {
  userId: string;
  name: string;
  role: Role;
};

const BOARD_ID = "main-board";
const ROLES: Role[] = ["viewer", "editor", "admin"];
const DB_NAME = "kanban-auth";
const STORE_NAME = "users";
const CHAT_STORE_NAME = "chat";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
        db.createObjectStore(CHAT_STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function loadSavedUser(): Promise<User | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get("localUser");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result ?? null);
  });
}

async function saveUser(user: User) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(user, "localUser");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

async function loadBoardChatMessages(boardId: string): Promise<ChatMessage[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE_NAME, "readonly");
    const store = tx.objectStore(CHAT_STORE_NAME);
    const req = store.get(`chat:${boardId}`);
    req.onerror = () => reject(req.error);
    req.onsuccess = () =>
      resolve((req.result as ChatMessage[] | undefined) ?? []);
  });
}

async function saveBoardChatMessages(boardId: string, messages: ChatMessage[]) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE_NAME, "readwrite");
    const store = tx.objectStore(CHAT_STORE_NAME);
    const req = store.put(messages, `chat:${boardId}`);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export default function Dashboard({
  wsClient,
  wsConnected,
}: {
  wsClient: WebSocketClient | null;
  wsConnected: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<Role>("editor");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedUser().then((saved) => {
      if (saved) setUser(saved);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    loadBoardChatMessages(BOARD_ID)
      .then(setChatMessages)
      .catch(() => setChatMessages([]));
  }, [user]);

  // One join for the whole app (board + chat + paper share it).
  useRoomJoin(wsClient, wsConnected, user, BOARD_ID);

  useEffect(() => {
    if (!wsClient) return;

    const unsubs = [
      wsClient.on("presence:update", (msg) => setPresence(msg.users)),
      wsClient.on("error", (msg) =>
        setError(msg.message ?? "Something went wrong."),
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [wsClient]);

  const handleSaveUser = async () => {
    if (!nameInput.trim()) {
      setError("Please enter your name.");
      return;
    }

    const nextUser: User = {
      userId: crypto.randomUUID(),
      name: nameInput.trim(),
      role: roleInput,
    };
    await saveUser(nextUser);
    setUser(nextUser);
    setError(null);
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
        <div className="mx-auto flex max-w-lg flex-col gap-8 rounded-[32px] border border-slate-200 bg-white p-10 shadow-lg">
          <div>
            <h1 className="text-3xl font-semibold">Join the realtime board</h1>
            <p className="mt-2 text-sm text-slate-600">
              Store your user session in IndexedDB and join the collaborative
              workspace.
            </p>
          </div>
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm text-slate-700">
              Your name
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="Enter a display name"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              Role
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as Role)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handleSaveUser}
              className="rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Save and join board
            </button>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Realtime dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                Collaborative workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                One WebSocket connection powers board, chat, and shared doc.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-center">
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div>Role: {user.role}</div>
              </div>
              <div
                className="rounded-3xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
                style={{
                  backgroundColor: wsConnected ? "#16a34a" : "#c2410c",
                }}
              >
                {wsConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        {wsClient ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <Board ws={wsClient} user={user} />
              <PaperDoc
                ws={wsClient}
                userId={user.userId}
                boardId={BOARD_ID}
              />
            </div>

            <aside className="space-y-4">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Live participants
                </h2>
                <div className="mt-4 space-y-3">
                  {presence.length ? (
                    presence.map((person) => (
                      <div
                        key={person.userId}
                        className="flex items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3"
                      >
                        <span
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {person.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {person.role}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No active users yet.
                    </div>
                  )}
                </div>
              </div>

              <ChatPanel
                ws={wsClient}
                user={user}
                boardId={BOARD_ID}
                presence={presence}
                initialMessages={chatMessages}
                onPersist={(messages) => {
                  saveBoardChatMessages(BOARD_ID, messages).catch(
                    () => undefined,
                  );
                }}
              />
            </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}
