"use client";

import { useEffect, useState } from "react";
import type { Card, Column } from "@kanban/shared";
import type { WebSocketClient } from "@/websocket";

type User = {
  userId: string;
  role: "viewer" | "editor" | "admin";
};

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Board({
  ws,
  user,
}: {
  ws: WebSocketClient;
  user: User;
}) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      ws.on("sync:state", (msg) => {
        setColumns(msg.columns);
        setCards(msg.cards);
      }),
      ws.on("card:create", (msg) => {
        const card = msg.card as Card;
        setCards((prev) =>
          prev.some((c) => c.id === card.id) ? prev : [...prev, card],
        );
      }),
      ws.on("card:update", (msg) => {
        setCards((prev) =>
          prev.map((card) =>
            card.id === msg.cardId
              ? {
                  ...card,
                  title: msg.title ?? card.title,
                  description: msg.description ?? card.description,
                  updatedAt: msg.updatedAt,
                  updatedBy: msg.updatedBy,
                }
              : card,
          ),
        );
      }),
      ws.on("card:delete", (msg) => {
        setCards((prev) => prev.filter((card) => card.id !== msg.cardId));
      }),
      ws.on("card:move", (msg) => {
        setCards((prev) =>
          prev.map((card) =>
            card.id === msg.cardId
              ? {
                  ...card,
                  columnId: msg.toColumnId,
                  order: msg.order,
                  updatedAt: msg.updatedAt,
                  updatedBy: msg.updatedBy,
                }
              : card,
          ),
        );
      }),
      ws.on("card:move:ack", (msg) => {
        if (!msg.accepted) return;
        setCards((prev) =>
          prev.map((card) =>
            card.id === msg.cardId
              ? {
                  ...card,
                  columnId: msg.toColumnId,
                  order: msg.order,
                  updatedAt: msg.updatedAt,
                  updatedBy: msg.updatedBy,
                }
              : card,
          ),
        );
      }),
      ws.on("column:create", (msg) => {
        const column = {
          ...msg.column,
          boardId: msg.column.boardId ?? "",
        };
        setColumns((prev) =>
          [...prev, column].sort((a, b) => a.order - b.order),
        );
      }),
      ws.on("column:delete", (msg) => {
        setColumns((prev) => prev.filter((c) => c.id !== msg.columnId));
        setCards((prev) => prev.filter((c) => c.columnId !== msg.columnId));
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [ws]);

  const createCard = () => {
    if (!newCardTitle.trim()) return;

    const firstColumn = [...columns].sort((a, b) => a.order - b.order)[0];
    if (!firstColumn) {
      setError("Board is still loading.");
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

    setCards((prev) =>
      prev.some((item) => item.id === card.id) ? prev : [...prev, card],
    );
    ws.send({
      type: "card:create",
      card: {
        id: card.id,
        columnId: card.columnId,
        title: card.title,
        description: card.description ?? undefined,
        order: card.order,
      },
      updatedBy: user.userId,
    });
    setNewCardTitle("");
    setError(null);
  };

  const moveCard = (cardId: string, columnId: string) => {
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

    ws.send({
      type: "card:move",
      cardId,
      toColumnId: columnId,
      order,
      updatedBy: user.userId,
      updatedAt,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Board</h2>
            <p className="text-sm leading-6 text-slate-600">
              Drag cards between columns.
            </p>
          </div>
          {user.role !== "viewer" ? (
            <div className="flex gap-3">
              <input
                className="w-full min-w-[220px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="New card title"
              />
              <button
                onClick={createCard}
                className="rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Add card
              </button>
            </div>
          ) : null}
        </div>
        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((column) => {
            const columnCards = cards
              .filter((card) => card.columnId === column.id)
              .sort((a, b) => Number(a.order) - Number(b.order));

            return (
              <div
                key={column.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  moveCard(e.dataTransfer.getData("text/plain"), column.id);
                }}
                className="flex min-w-[240px] flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                    {column.title}
                  </h3>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600">
                    {columnCards.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {columnCards.map((card) => (
                    <div
                      key={card.id}
                      draggable={user.role !== "viewer"}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", card.id)
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                        {card.title}
                        <span className="text-xs text-slate-500">
                          {formatTime(card.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {card.description ?? "No description yet."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
