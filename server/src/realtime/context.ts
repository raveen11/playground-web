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