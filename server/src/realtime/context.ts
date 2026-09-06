import { RoomManager } from "./board/room-manager.js";
import { BoardState } from "./board/state.js";
import { WhiteboardRooms } from "./whiteboard/room.js";
import { WhiteboardManager } from "./whiteboard/whiteboard-manager.js";

export function createRealtimeContext() {
  return {
    rooms: new RoomManager(),
    boardState: new BoardState(),
    whiteboard: new WhiteboardManager(),
    whiteboardRooms: new WhiteboardRooms(),
  };
}

export type RealtimeContext = ReturnType<
  typeof createRealtimeContext
>;

export const globalRealtimeContext = createRealtimeContext();

export function broadcastToBoard(boardId: string, message: unknown) {
  try {
    globalRealtimeContext.rooms.broadcast(boardId, message);
  } catch (err) {
    console.error("Failed to broadcast realtime message:", err);
  }
}