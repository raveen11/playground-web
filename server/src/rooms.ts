import type { WebSocket } from "ws";
import type { PresenceUser } from "@kanban/shared";
import { pickColor } from "@kanban/shared";

export interface ClientMeta {
  ws: WebSocket;
  userId: string;
  name: string;
  role: "viewer" | "editor" | "admin";
  color: string;
  boardId: string;
  cursor: { x: number; y: number } | null;
  lastSeen: number;
}

export class RoomManager {
  private rooms = new Map<string, Map<string, ClientMeta>>();
  private seqByBoard = new Map<string, number>();

  join(boardId: string, meta: Omit<ClientMeta, "boardId" | "color" | "cursor" | "lastSeen"> & { color?: string }) {
    let room = this.rooms.get(boardId);
    if (!room) {
      room = new Map();
      this.rooms.set(boardId, room);
    }

    const color = meta.color ?? pickColor(room.size);
    const client: ClientMeta = {
      ...meta,
      role: meta.role ?? "viewer",
      boardId,
      color,
      cursor: null,
      lastSeen: Date.now(),
    };
    room.set(meta.userId, client);
    return client;
  }

  leave(boardId: string, userId: string) {
    const room = this.rooms.get(boardId);
    if (!room) return;
    room.delete(userId);
    if (room.size === 0) this.rooms.delete(boardId);
  }

  get(boardId: string, userId: string) {
    return this.rooms.get(boardId)?.get(userId);
  }

  listPresence(boardId: string): PresenceUser[] {
    const room = this.rooms.get(boardId);
    if (!room) return [];
    return [...room.values()].map((c) => ({
      userId: c.userId,
      name: c.name,
      role: c.role,
      color: c.color,
      cursor: c.cursor,
    }));
  }

  touch(boardId: string, userId: string) {
    const client = this.get(boardId, userId);
    if (client) client.lastSeen = Date.now();
  }

  setCursor(boardId: string, userId: string, x: number, y: number) {
    const client = this.get(boardId, userId);
    if (!client) return;
    client.cursor = { x, y };
    client.lastSeen = Date.now();
  }

  nextSeq(boardId: string) {
    const next = (this.seqByBoard.get(boardId) ?? 0) + 1;
    this.seqByBoard.set(boardId, next);
    return next;
  }

  broadcast(boardId: string, data: unknown, exceptUserId?: string) {
    const room = this.rooms.get(boardId);
    if (!room) return;
    const payload = JSON.stringify(data);
    for (const client of room.values()) {
      if (exceptUserId && client.userId === exceptUserId) continue;
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  send(ws: WebSocket, data: unknown) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  pruneStale(timeoutMs: number) {
    const now = Date.now();
    for (const [boardId, room] of this.rooms) {
      const stale: string[] = [];
      for (const [userId, client] of room) {
        if (now - client.lastSeen > timeoutMs) {
          stale.push(userId);
          try {
            client.ws.close();
          } catch {
            /* ignore */
          }
        }
      }
      for (const userId of stale) {
        room.delete(userId);
      }
      if (stale.length > 0) {
        this.broadcast(boardId, {
          type: "presence:update",
          users: this.listPresence(boardId),
        });
      }
      if (room.size === 0) this.rooms.delete(boardId);
    }
  }

  findBySocket(ws: WebSocket): ClientMeta | undefined {
    for (const room of this.rooms.values()) {
      for (const client of room.values()) {
        if (client.ws === ws) return client;
      }
    }
    return undefined;
  }
}
