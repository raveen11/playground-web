"use client";

import { useEffect, useState } from "react";
import type { WebSocketClient } from "@/websocket";

export default function PaperDoc({
  ws,
  userId,
  boardId,
}: {
  ws: WebSocketClient;
  userId: string;
  boardId: string;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("typedData");
    if (saved) setText(saved);

    return ws.on("data:paper", (msg) => {
      if (msg.userId === userId) return;
      setText(msg.paperData ?? "");
      localStorage.setItem("typedData", msg.paperData ?? "");
    });
  }, [ws, userId]);

  const onChange = (value: string) => {
    const local = localStorage.getItem("typedData");
    if (local === value) return;

    setText(value);
    localStorage.setItem("typedData", value);

    if (!ws.isConnected) return;
    ws.send({
      type: "data:paper",
      boardId,
      userId,
      paperData: value,
    });
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Shared doc</h2>
      <p className="mt-1 text-sm text-slate-600">
        Collaborative textarea — syncs over the same connection.
      </p>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className="mt-4 min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
        placeholder="Start typing..."
      />
    </div>
  );
}
