"use client";

import { useEffect, useRef, useState } from "react";
import type { PresenceUser } from "@kanban/shared";
import type { ChatMessage, WebSocketClient } from "@/websocket";

type User = {
  userId: string;
  name: string;
};

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPanel({
  ws,
  user,
  boardId,
  presence,
  initialMessages,
  onPersist,
}: {
  ws: WebSocketClient;
  user: User;
  boardId: string;
  presence: PresenceUser[];
  initialMessages: ChatMessage[];
  onPersist: (messages: ChatMessage[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const persistRef = useRef(onPersist);
  persistRef.current = onPersist;

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const unsubs = [
      ws.on("chat:history", (msg) => {
        setMessages(msg.messages);
        persistRef.current(msg.messages);
      }),
      ws.on("chat:message", (msg) => {
        if (!msg.userId || !msg.name || !msg.text || !msg.sentAt) return;

        const next: ChatMessage = {
          id: msg.id ?? `${msg.userId}-${msg.sentAt}`,
          userId: msg.userId,
          name: msg.name,
          color: msg.color ?? "#64748b",
          text: msg.text,
          sentAt: msg.sentAt,
        };

        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              m.id === next.id ||
              (m.userId === next.userId &&
                m.text === next.text &&
                m.sentAt === next.sentAt),
          );
          const updated = exists ? prev : [...prev, next];
          persistRef.current(updated);
          return updated;
        });
      }),
      ws.on("chat:typing", (msg) => {
        if (!msg.userId || msg.isTyping === undefined) return;
        setTypingUsers((prev) => {
          const next = msg.isTyping
            ? [...new Set([...prev, msg.userId])]
            : prev.filter((id) => id !== msg.userId);
          return next.filter((id) => id !== user.userId);
        });
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [ws, user.userId]);

  const sendTyping = (isTyping: boolean) => {
    if (!ws.isConnected) return;
    ws.send({
      type: "chat:typing",
      boardId,
      userId: user.userId,
      name: user.name,
      isTyping,
    });
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const text = input.trim();
    const sentAt = new Date().toISOString();
    const color =
      presence.find((p) => p.userId === user.userId)?.color ?? "#64748b";
    const next: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.userId,
      name: user.name,
      color,
      text,
      sentAt,
    };

    setMessages((prev) => {
      const updated = [...prev, next];
      persistRef.current(updated);
      return updated;
    });
    setInput("");
    sendTyping(false);

    ws.send({
      type: "chat:message",
      boardId,
      userId: user.userId,
      name: user.name,
      text,
      sentAt,
    });
  };

  const onInputChange = (value: string) => {
    setInput(value);
    const typing = value.trim().length > 0;
    sendTyping(typing);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (typing) {
      typingTimeoutRef.current = window.setTimeout(
        () => sendTyping(false),
        1200,
      );
    }
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Team chat</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Live
        </span>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {messages.length ? (
          messages.map((message) => {
            const isOutgoing = message.userId === user.userId;
            return (
              <div
                key={message.id}
                className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] ${isOutgoing ? "items-end" : "items-start"} flex flex-col gap-1`}
                >
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
                  <span className="text-[10px] text-slate-400">
                    {formatTime(message.sentAt)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
            No messages yet. Start the conversation.
          </div>
        )}

        {typingUsers.length ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {typingUsers
              .map((id) => {
                const person = presence.find((entry) => entry.userId === id);
                return person
                  ? `${person.name} is typing...`
                  : "Someone is typing...";
              })
              .join(" • ")}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
        <button
          onClick={sendMessage}
          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Send
        </button>
      </div>
    </div>
  );
}
