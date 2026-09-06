"use client";

import { useCallback, useEffect, useState } from "react";
import type { Card, Column } from "@kanban/shared";
import type { WebSocketClient } from "@/websocket";
import { api, type CompanyUser } from "@/lib/apiClient";

type User = {
  userId: string;
  name: string;
  role: "viewer" | "editor" | "admin" | string;
};

type CardWithDetails = Card & {
  priority?: string | null;
  status?: string | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

function formatTime(timestamp?: string) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Board({
  ws,
  user,
  boardId,
  companyUsers = [],
}: {
  ws: WebSocketClient;
  user: User;
  boardId: string;
  companyUsers?: CompanyUser[];
}) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<CardWithDetails[]>([]);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardPriority, setNewCardPriority] = useState("medium");
  const [newCardAssigneeId, setNewCardAssigneeId] = useState("");
  const [newCardColId, setNewCardColId] = useState<string>("");
  const [isAddingCard, setIsAddingCard] = useState(false);

  const [newColName, setNewColName] = useState("");
  const [isAddingCol, setIsAddingCol] = useState(false);

  const [editingCard, setEditingCard] = useState<CardWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load from PostgreSQL via HTTP API
  const loadBoardData = useCallback(async () => {
    try {
      setLoading(true);
      const board = await api.boards.get(boardId);

      if (board && board.columns) {
        const cols: Column[] = board.columns.map((c) => ({
          id: c.id,
          boardId: c.boardId,
          title: c.name,
          order: c.position,
        }));

        const items: CardWithDetails[] = board.columns.flatMap((c) =>
          (c.tickets || []).map((t) => ({
            id: t.id,
            boardId: t.boardId,
            columnId: t.columnId,
            title: t.title,
            description: t.description,
            order: String(t.position),
            position: t.position,
            priority: t.priority,
            status: t.status,
            assigneeId: t.assigneeId,
            assignee: t.assignee,
            updatedAt: t.updatedAt || new Date().toISOString(),
            updatedBy: t.assignee?.name || "system",
          })),
        );

        setColumns(cols.sort((a, b) => a.order - b.order));
        setCards(items);
        setNewCardColId((prev) => (prev ? prev : (cols[0]?.id || "")));
      }
    } catch (err) {
      console.error("Failed to load board from PostgreSQL:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Realtime WebSocket listeners
  useEffect(() => {
    const unsubs = [
      ws.on("sync:state", (msg) => {
        setColumns(msg.columns);
        setCards(msg.cards as CardWithDetails[]);
      }),
      ws.on("card:create", (msg) => {
        const card = msg.card as CardWithDetails;
        setCards((prev) =>
          prev.some((c) => c.id === card.id) ? prev : [...prev, card],
        );
      }),
      ws.on("card:update", (msg) => {
        const payload = msg as unknown as Record<string, unknown>;
        setCards((prev) =>
          prev.map((card) =>
            card.id === msg.cardId
              ? {
                ...card,
                title: msg.title ?? card.title,
                description: msg.description !== undefined ? msg.description : card.description,
                priority: (payload.priority as string | undefined) ?? card.priority,
                status: (payload.status as string | undefined) ?? card.status,
                assigneeId: (payload.assigneeId as string | undefined) ?? card.assigneeId,
                assignee: (payload.assignee as CardWithDetails["assignee"]) ?? card.assignee,
                updatedAt: msg.updatedAt || new Date().toISOString(),
                updatedBy: msg.updatedBy || card.updatedBy,
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
        const colData = msg.column as unknown as Record<string, unknown>;
        const column: Column = {
          id: String(colData.id || ""),
          boardId: String(colData.boardId ?? boardId),
          title: String(colData.title || colData.name || ""),
          order: Number(colData.order ?? colData.position ?? 0),
        };
        setColumns((prev) =>
          prev.some((c) => c.id === column.id)
            ? prev
            : [...prev, column].sort((a, b) => a.order - b.order),
        );
      }),
      ws.on("column:delete", (msg) => {
        setColumns((prev) => prev.filter((c) => c.id !== msg.columnId));
        setCards((prev) => prev.filter((c) => c.columnId !== msg.columnId));
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [ws, boardId]);

  // Create Ticket (PostgreSQL first -> UI & WS)
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    const targetColumnId = newCardColId || columns[0]?.id;
    if (!targetColumnId) {
      setError("No columns available. Please create a column first.");
      return;
    }

    try {
      setError(null);
      const created = await api.tickets.create({
        boardId,
        columnId: targetColumnId,
        title: newCardTitle.trim(),
        description: newCardDesc.trim() || null,
        priority: newCardPriority,
        assigneeId: newCardAssigneeId || null,
      });

      const nextCard: CardWithDetails = {
        id: created.id,
        boardId: created.boardId,
        columnId: created.columnId,
        title: created.title,
        description: created.description,
        order: String(created.position),
        position: created.position,
        priority: created.priority,
        status: created.status,
        assigneeId: created.assigneeId,
        assignee: created.assignee,
        updatedAt: created.updatedAt || new Date().toISOString(),
        updatedBy: user.name,
      };

      setCards((prev) =>
        prev.some((c) => c.id === nextCard.id) ? prev : [...prev, nextCard],
      );

      setNewCardTitle("");
      setNewCardDesc("");
      setIsAddingCard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    }
  };

  // Move Ticket (PostgreSQL first -> UI & WS)
  const handleMoveCard = async (cardId: string, toColumnId: string) => {
    const targetCards = cards.filter((c) => c.columnId === toColumnId);
    const newPosition = targetCards.length;
    const updatedAt = new Date().toISOString();

    // Optimistic UI update
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
            ...c,
            columnId: toColumnId,
            order: String(newPosition),
            position: newPosition,
            updatedAt,
            updatedBy: user.name,
          }
          : c,
      ),
    );

    try {
      await api.tickets.move(cardId, {
        toColumnId,
        position: newPosition,
      });
    } catch (err) {
      console.error("Failed to move ticket on server:", err);
      loadBoardData();
    }
  };

  // Save Card Edits
  const handleSaveEdit = async () => {
    if (!editingCard) return;

    try {
      const updated = await api.tickets.update(editingCard.id, {
        title: editingCard.title,
        description: editingCard.description,
        priority: editingCard.priority,
        assigneeId: editingCard.assigneeId,
      });

      setCards((prev) =>
        prev.map((c) =>
          c.id === updated.id
            ? {
              ...c,
              title: updated.title,
              description: updated.description,
              priority: updated.priority,
              assigneeId: updated.assigneeId,
              assignee: updated.assignee,
              updatedAt: updated.updatedAt || new Date().toISOString(),
            }
            : c,
        ),
      );

      setEditingCard(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket");
    }
  };

  // Delete Card
  const handleDeleteCard = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;

    try {
      await api.tickets.delete(ticketId);
      setCards((prev) => prev.filter((c) => c.id !== ticketId));
      if (editingCard?.id === ticketId) {
        setEditingCard(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete ticket");
    }
  };

  // Create Column
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      const created = await api.boards.createColumn(boardId, {
        name: newColName.trim(),
        position: columns.length,
      });

      setColumns((prev) => [
        ...prev,
        {
          id: created.id,
          boardId: created.boardId,
          title: created.name,
          order: created.position,
        },
      ]);
      setNewColName("");
      setIsAddingCol(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create column");
    }
  };

  // Delete Column
  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column and all its tickets?")) return;

    try {
      await api.columns.delete(columnId);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setCards((prev) => prev.filter((c) => c.columnId !== columnId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete column");
    }
  };

  const getPriorityColor = (priority?: string | null) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Task Board</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                PostgreSQL Synced
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Prisma source of truth with realtime WebSocket delivery
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsAddingCard(!isAddingCard)}
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              {isAddingCard ? "Cancel" : "+ Add Ticket"}
            </button>
            <button
              onClick={() => setIsAddingCol(!isAddingCol)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isAddingCol ? "Cancel" : "+ Add Column"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Add Ticket Form */}
        {isAddingCard ? (
          <form onSubmit={handleCreateCard} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Ticket Title *"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400"
              required
            />
            <input
              value={newCardDesc}
              onChange={(e) => setNewCardDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400"
            />
            <div className="flex gap-2">
              <select
                value={newCardPriority}
                onChange={(e) => setNewCardPriority(e.target.value)}
                className="w-1/2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <select
                value={newCardAssigneeId}
                onChange={(e) => setNewCardAssigneeId(e.target.value)}
                className="w-1/2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none"
              >
                <option value="">Unassigned</option>
                {companyUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={newCardColId}
                onChange={(e) => setNewCardColId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </form>
        ) : null}

        {/* Add Column Form */}
        {isAddingCol ? (
          <form onSubmit={handleCreateColumn} className="flex gap-2 rounded-2xl bg-slate-50 p-3">
            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Column Name (e.g. In Review, QA)"
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Add
            </button>
          </form>
        ) : null}
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading board from PostgreSQL...
        </div>
      ) : columns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          No columns yet. Click &quot;+ Add Column&quot; above to create one.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {columns.map((column) => {
            const colCards = cards
              .filter((c) => c.columnId === column.id)
              .sort((a, b) => Number(a.order) - Number(b.order));

            return (
              <div
                key={column.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const cardId = e.dataTransfer.getData("text/plain");
                  if (cardId) {
                    handleMoveCard(cardId, column.id);
                  }
                }}
                className="flex min-w-[260px] flex-col rounded-3xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm"
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {column.title}
                    </h3>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {colCards.length}
                    </span>
                  </div>
                  {columns.length > 1 ? (
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      className="text-slate-300 transition hover:text-rose-500 text-xs"
                      title="Delete column"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>

                {/* Column Tickets */}
                <div className="flex flex-1 flex-col gap-2.5 min-h-[120px]">
                  {colCards.map((card) => (
                    <div
                      key={card.id}
                      draggable={user.role !== "viewer"}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", card.id)
                      }
                      onClick={() => setEditingCard(card)}
                      className="group cursor-grab rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300 hover:shadow active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                          {card.title}
                        </span>
                        <div className="flex items-center gap-1">
                          {card.priority ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getPriorityColor(
                                card.priority,
                              )}`}
                            >
                              {card.priority}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {card.description ? (
                        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                          {card.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                        <span>
                          {card.assignee ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <span className="h-4 w-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                                {card.assignee.name.charAt(0).toUpperCase()}
                              </span>
                              {card.assignee.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </span>
                        <span>{formatTime(card.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingCard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Ticket
              </h3>
              <button
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Title</label>
                <input
                  value={editingCard.title}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  value={editingCard.description || ""}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={editingCard.priority || "medium"}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        priority: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Assignee</label>
                  <select
                    value={editingCard.assigneeId || ""}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        assigneeId: e.target.value || null,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                  >
                    <option value="">Unassigned</option>
                    {companyUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => handleDeleteCard(editingCard.id)}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Delete Ticket
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
