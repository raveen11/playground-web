"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "viewer" | "editor" | "admin";

type User = {
  userId: string;
  name: string;
  role: Role;
};

type Card = {
  id: string;
  columnId: string;
  title: string;
  description?: string | null;
  order: string;
  updatedAt: string;
  updatedBy: string;
};

type Column = {
  id: string;
  boardId: string;
  title: string;
  order: number;
};

type PresenceUser = {
  userId: string;
  name: string;
  role: Role;
  color: string;
  cursor: { x: number; y: number } | null;
};

type ChatMessage = {
  id: string;
  userId: string;
  name: string;
  color: string;
  text: string;
  sentAt: string;
};

type SocketMessage = {
  id?: string;
  type?: string;
  columns?: Column[];
  cards?: Card[];
  users?: PresenceUser[];
  card?: Card;
  cardId?: string;
  toColumnId?: string;
  order?: string;
  updatedAt?: string;
  updatedBy?: string;
  title?: string;
  description?: string | null;
  column?: Column;
  columnId?: string;
  message?: string;
  messages?: ChatMessage[];
  userId?: string;
  name?: string;
  text?: string;
  sentAt?: string;
  color?: string;
  isTyping?: boolean;
  paperData?: string;
};

const BOARD_ID = "main-board";
const WS_PORT = 3002;

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
    req.onsuccess = () => resolve((req.result as ChatMessage[] | undefined) ?? []);
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

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<Role>("editor");
  const [wsConnected, setWsConnected] = useState(false);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const [typeData, setTypeData] = useState("");

  const boardUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `ws://playgroundweb.vercel.app:${WS_PORT}`;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://playgroundweb.vercel.app:${WS_PORT}`;
  }, []);

  useEffect(() => {
    loadSavedUser().then((saved) => {
      if (saved) {
        setUser(saved);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    loadBoardChatMessages(BOARD_ID)
      .then((messages) => {
        setChatMessages(messages);
      })
      .catch(() => {
        setChatMessages([]);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = new WebSocket(boardUrl);
    wsRef.current = socket;

    socket.addEventListener("open", () => {
      setWsConnected(true);
      setError(null);
      socket.send(
        JSON.stringify({
          type: "room:join",
          boardId: BOARD_ID,
          userId: user.userId,
          name: user.name,
          role: user.role,
        }),
      );

      if (heartbeatRef.current !== null) {
        window.clearInterval(heartbeatRef.current);
      }
      heartbeatRef.current = window.setInterval(() => {
        socket.send(JSON.stringify({ type: "heartbeat", userId: user.userId }));
      }, 10_000);
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data) as SocketMessage;
      console.log("Received message:", data);
      switch (data.type) {
        case "sync:state":
          if (data.columns) setColumns(data.columns);
          if (data.cards) setCards(data.cards);
          break;
        case "presence:update":
          if (data.users) setPresence(data.users);
          break;
        case "chat:history":
          if (data.messages) {
            setChatMessages(data.messages);
            saveBoardChatMessages(BOARD_ID, data.messages).catch(() => undefined);
          }
          break;
        case "chat:message":
          if (data.userId && data.name && data.text && data.sentAt) {
            const nextMessage: ChatMessage = {
              id: data.id ?? `${data.userId}-${data.sentAt}`,
              userId: data.userId,
              name: data.name,
              color: data.color ?? "#64748b",
              text: data.text,
              sentAt: data.sentAt,
            };
            setChatMessages((prev) => {
              const exists = prev.some(
                (msg) => msg.id === nextMessage.id || (msg.userId === nextMessage.userId && msg.text === nextMessage.text && msg.sentAt === nextMessage.sentAt),
              );
              const next = exists ? prev : [...prev, nextMessage];
              saveBoardChatMessages(BOARD_ID, next).catch(() => undefined);
              return next;
            });
          }
          break;
        case "chat:typing":
          if (!data.userId || data.name === undefined || data.isTyping === undefined) break;
          setTypingUsers((prev) => {
            const next = data.isTyping ? [...new Set([...prev, data.userId!])] : prev.filter((id) => id !== data.userId);
            return next.filter((id) => id !== user?.userId);
          });
          break;
        case "card:create":
          if (data.card) {
            setCards((prev) => (prev.some((card) => card.id === data.card!.id) ? prev : [...prev, data.card!]));
          }
          break;
        case "card:update":
          if (data.cardId && data.updatedAt && data.updatedBy) {
            setCards((prev) =>
              prev.map((card) =>
                card.id === data.cardId
                  ? {
                      ...card,
                      title: data.title ?? card.title,
                      description: data.description ?? card.description,
                      updatedAt: data.updatedAt!,
                      updatedBy: data.updatedBy!,
                    }
                  : card,
              ),
            );
          }
          break;
        case "card:delete":
          if (data.cardId) {
            setCards((prev) => prev.filter((card) => card.id !== data.cardId));
          }
          break;
        case "card:move":
          if (data.cardId && data.toColumnId && data.order && data.updatedAt && data.updatedBy) {
            setCards((prev) =>
              prev.map((card) =>
                card.id === data.cardId
                  ? {
                      ...card,
                      columnId: data.toColumnId!,
                      order: data.order!,
                      updatedAt: data.updatedAt!,
                      updatedBy: data.updatedBy!,
                    }
                  : card,
              ),
            );
          }
          break;
        case "column:create":
          if (data.column) {
            setColumns((prev) => [...prev, data.column!].sort((a, b) => a.order - b.order));
          }
          break;
        case "column:delete":
          if (data.columnId) {
            setColumns((prev) => prev.filter((column) => column.id !== data.columnId));
            setCards((prev) => prev.filter((card) => card.columnId !== data.columnId));
          }
          break;
        case "data:paper":
          setTypeData(data?.paperData ?? "");
          break;  
        case "error":
          setError(data.message ?? "Something went wrong.");
          break;
        default:
          break;
      }
    });

    socket.addEventListener("close", () => {
      setWsConnected(false);
    });

    socket.addEventListener("error", () => {
      setError("WebSocket connection failed.");
      setWsConnected(false);
    });

    return () => {
      if (heartbeatRef.current !== null) {
        window.clearInterval(heartbeatRef.current);
      }
      socket.close();
    };
  }, [boardUrl, user]);

  const updateTypedData = (newData: string) => {
    const localData= localStorage.getItem("typedData");
    console.log("Updating typed data:", newData,{
       type: "data:paper",
        boardId: BOARD_ID,
        userId: user?.userId,
        paperData: newData,
      });
    if (localData === newData) return; // avoid sending if data is the same
    setTypeData(newData);
    if (!user || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "data:paper",
        boardId: BOARD_ID,
        userId: user.userId,
        paperData: newData,
      }),
    );
    
    // save the typed data to local storage
    localStorage.setItem("typedData", newData);
  }

  // useEffect(() => {
  //   const onPointerMove = (event: PointerEvent) => {
  //     if (!wsConnected || !user) return;
  //     wsRef.current?.send(
  //       JSON.stringify({
  //         type: "cursor:move",
  //         userId: user.userId,
  //         x: event.clientX,
  //         y: event.clientY,
  //       }),
  //     );
  //   };

  //   window.addEventListener("pointermove", onPointerMove);
  //   return () => window.removeEventListener("pointermove", onPointerMove);
  // }, [wsConnected, user]);

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

  const handleCreateCard = () => {
    if (!user || !newCardTitle.trim()) return;

    const firstColumn = [...columns].sort((a, b) => a.order - b.order)[0];
    if (!firstColumn) {
      setError("Board is still loading. Please wait a moment and try again.");
      return;
    }

    const card: Card = {
      id: crypto.randomUUID(),
      columnId: firstColumn.id,
      title: newCardTitle.trim(),
      description: null,
      order: String(Date.now()),
      updatedAt: new Date().toISOString(),
      updatedBy: user.userId,
    };

    setCards((prev) => (prev.some((item) => item.id === card.id) ? prev : [...prev, card]));
    wsRef.current?.send(
      JSON.stringify({ type: "card:create", card, updatedBy: user.userId }),
    );
    setNewCardTitle("");
  };

  const handleDrop = (cardId: string, columnId: string) => {
    if (!user) return;
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    const columnCards = cards.filter((item) => item.columnId === columnId);
    const order = String(columnCards.length * 100 + Date.now());
    const updatedAt = new Date().toISOString();

    setCards((prev) =>
      prev.map((item) =>
        item.id === cardId
          ? { ...item, columnId, order, updatedAt, updatedBy: user.userId }
          : item,
      ),
    );

    wsRef.current?.send(
      JSON.stringify({
        type: "card:move",
        cardId,
        toColumnId: columnId,
        order,
        updatedBy: user.userId,
        updatedAt,
      }),
    );
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!user || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "chat:typing",
        boardId: BOARD_ID,
        userId: user.userId,
        name: user.name,
        isTyping,
      }),
    );
  };

  const handleChatSend = () => {
    if (!user || !chatInput.trim()) return;
    const text = chatInput.trim();
    const sentAt = new Date().toISOString();
    const color = presence.find((person) => person.userId === user.userId)?.color ?? "#64748b";
    const nextMessage: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.userId,
      name: user.name,
      color,
      text,
      sentAt,
    };

    setChatMessages((prev) => {
      const exists = prev.some(
        (msg) => msg.id === nextMessage.id || (msg.userId === nextMessage.userId && msg.text === nextMessage.text && msg.sentAt === nextMessage.sentAt),
      );
      const next = exists ? prev : [...prev, nextMessage];
      saveBoardChatMessages(BOARD_ID, next).catch(() => undefined);
      return next;
    });
    setChatInput("");
    sendTypingStatus(false);

    wsRef.current?.send(
      JSON.stringify({
        type: "chat:message",
        boardId: BOARD_ID,
        userId: user.userId,
        name: user.name,
        text,
        sentAt,
      }),
    );
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);
    if (!user) return;

    const shouldShowTyping = value.trim().length > 0;
    sendTypingStatus(shouldShowTyping);

    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (shouldShowTyping) {
      typingTimeoutRef.current = window.setTimeout(() => sendTypingStatus(false), 1200);
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, cardId: string) => {
    event.dataTransfer.setData("text/plain", cardId);
  };

  const renderColumns = () => {
    return columns
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((column) => {
        const columnCards = cards
          .filter((card) => card.columnId === column.id)
          .sort((a, b) => Number(a.order) - Number(b.order));

        return (
          <div
            key={column.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const cardId = event.dataTransfer.getData("text/plain");
              handleDrop(cardId, column.id);
            }}
            className="flex min-w-[240px] flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                {column.title}
              </h2>
              <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600">
                {columnCards.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {columnCards.map((card) => (
                <div
                  key={card.id}
                  draggable={user?.role !== "viewer"}
                  onDragStart={(event) => handleDragStart(event, card.id)}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                    {card.title}
                    <span className="text-xs text-slate-500">{formatTime(card.updatedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {card.description ?? "No description yet."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      });
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
        
        
        <div className="mx-auto flex max-w-lg flex-col gap-8 rounded-[32px] border border-slate-200 bg-white p-10 shadow-lg">
          <div>
            <h1 className="text-3xl font-semibold">Join the realtime board</h1>
            <p className="mt-2 text-sm text-slate-600">Store your user session in IndexedDB and join the collaborative workspace.</p>
          </div>
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm text-slate-700">
              Your name
              <input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="Enter a display name"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              Role
              <select
                value={roleInput}
                onChange={(event) => setRoleInput(event.target.value as Role)}
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
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Realtime dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Collaborative whiteboard board</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Drag cards between columns, see other users, and keep your auth state saved in IndexedDB.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-center">
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div>Role: {user.role}</div>
              </div>
              <div className="rounded-3xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: wsConnected ? "#16a34a" : "#c2410c" }}>
                {wsConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>
        </section>
            <textarea value={typeData} onChange={(e) => updateTypedData(e.target.value)} />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Board workspace</h2>
                  <p className="text-sm leading-6 text-slate-600">Move cards across columns to update the shared state.</p>
                </div>
                {user.role !== "viewer" ? (
                  <div className="flex gap-3">
                    <input
                      className="w-full min-w-[220px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                      value={newCardTitle}
                      onChange={(event) => setNewCardTitle(event.target.value)}
                      placeholder="New card title"
                    />
                    <button
                      onClick={handleCreateCard}
                      className="rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Add card
                    </button>
                  </div>
                ) : null}
              </div>
              {error ? <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">{renderColumns()}</div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Live participants</h2>
              <div className="mt-4 space-y-3">
                {presence.length ? (
                  presence.map((person) => (
                    <div key={person.userId} className="flex items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{person.name}</div>
                        <div className="text-xs text-slate-500">{person.role}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">No active users yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Team chat</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Live
                </span>
              </div>

              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {chatMessages.length ? (
                  chatMessages.map((message) => {
                    const isOutgoing = message.userId === user.userId;
                    return (
                      <div key={message.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] ${isOutgoing ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            {!isOutgoing ? (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: message.color }}
                              >
                                {message.name.charAt(0).toUpperCase()}
                              </span>
                            ) : null}
                            <span>{isOutgoing ? "You" : message.name}</span>
                          </div>
                          <div
                            className={`rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm ${
                              isOutgoing
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {message.text}
                          </div>
                          <span className="text-[10px] text-slate-400">{formatTime(message.sentAt)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">No messages yet. Start the conversation.</div>
                )}

                {typingUsers.length ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    {typingUsers.map((id) => {
                      const person = presence.find((entry) => entry.userId === id);
                      return person ? `${person.name} is typing...` : "Someone is typing...";
                    }).join(" • ")}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => handleChatInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                />
                <button
                  onClick={handleChatSend}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Send
                </button>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>1. Save your user profile in IndexedDB.</li>
                <li>2. Join the board and open the page in another browser.</li>
                <li>3. Drag cards between columns to sync in real time.</li>
                <li>4. Editors and admins can create and move cards.</li>
              </ul>
            </div>

          </aside>
        </section>
      </div>
    </main>
  );
}
