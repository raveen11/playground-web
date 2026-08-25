import type { WebSocket } from "ws";

type Membership = {
  whiteboardId: string;
  userId: string;
};

export class WhiteboardRooms {
  private rooms = new Map<
    string,
    Set<WebSocket>
  >();

  private memberships = new Map<
    WebSocket,
    Membership
  >();

  private roomKey(id: string) {
    return `whiteboard:${id}`;
  }

  join(
    ws: WebSocket,
    whiteboardId: string,
    userId: string,
  ) {
    this.leave(ws);

    const key = this.roomKey(whiteboardId);

    const room =
      this.rooms.get(key) ??
      new Set<WebSocket>();

    room.add(ws);

    this.rooms.set(key, room);

    this.memberships.set(ws, {
      whiteboardId,
      userId,
    });
  }

  leave(ws: WebSocket, whiteboardId?: string) {
    const membership =
      this.memberships.get(ws);

    const target =
      whiteboardId ??
      membership?.whiteboardId;

    if (!target) {
      return;
    }

    const key = this.roomKey(target);
    const room = this.rooms.get(key);

    room?.delete(ws);

    if (room?.size === 0) {
      this.rooms.delete(key);
    }

    if (
      membership?.whiteboardId === target
    ) {
      this.memberships.delete(ws);
    }
  }

  getMembership(ws: WebSocket) {
    return this.memberships.get(ws);
  }

  getClients(whiteboardId: string) {
    return (
      this.rooms.get(
        this.roomKey(whiteboardId),
      ) ?? new Set<WebSocket>()
    );
  }

  disconnect(ws: WebSocket) {
    this.leave(ws);
  }
}