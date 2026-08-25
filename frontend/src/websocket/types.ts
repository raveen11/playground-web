import type {
  CardCreateMsg,
  CardDeleteMsg,
  CardMoveAckMsg,
  CardMoveMsg,
  CardUpdateMsg,
  ChatHistoryMsg,
  ChatMessageEvent,
  ColumnCreateMsg,
  ColumnDeleteMsg,
  ErrorMsg,
  HeartbeatMsg,
  JoinRoomMsg,
  PaperMsg,
  PresenceUser,
  RequestSyncMsg,
  SyncStateMsg,
  TypingEvent,
  CursorMoveMsg,
} from "@kanban/shared";

export type ChatMessage = ChatHistoryMsg["messages"][number];

/** Inbound payloads the client may send to the server. */
export type ClientOutgoingMessage =
  | JoinRoomMsg
  | HeartbeatMsg
  | RequestSyncMsg
  | CursorMoveMsg
  | CardCreateMsg
  | CardUpdateMsg
  | CardDeleteMsg
  | CardMoveMsg
  | ColumnCreateMsg
  | ColumnDeleteMsg
  | ChatMessageEvent
  | TypingEvent
  | PaperMsg
  | { type: "connection:WS" };

/**
 * Server → client event map.
 * Keys are message `type` values; values are the typed payloads.
 */
export type ServerEventMap = {
  "sync:state": SyncStateMsg;
  "presence:update": { type: "presence:update"; users: PresenceUser[] };
  "chat:history": ChatHistoryMsg;
  "chat:message": ChatMessageEvent & { id?: string; color?: string };
  "chat:typing": TypingEvent;
  "card:create": CardCreateMsg;
  "card:update": CardUpdateMsg;
  "card:delete": CardDeleteMsg;
  "card:move": CardMoveMsg;
  "card:move:ack": CardMoveAckMsg;
  "column:create": ColumnCreateMsg & {
    column: ColumnCreateMsg["column"] & { boardId?: string };
  };
  "column:delete": ColumnDeleteMsg;
  "data:paper": PaperMsg;
  error: ErrorMsg;
};


export type ServerEventType = keyof ServerEventMap;

export type ConnectionEventMap = {
  open: undefined;
  close: { code: number; reason: string };
  error: Event;
  reconnecting: { attempt: number };
};

export type ConnectionEventType = keyof ConnectionEventMap;

export type ServerEventHandler<T extends ServerEventType> = (
  payload: ServerEventMap[T],
) => void;

export type ConnectionEventHandler<T extends ConnectionEventType> = (
  payload: ConnectionEventMap[T],
) => void;

export function isTypedServerMessage(
  value: unknown,
): value is { type: string } & Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string"
  );
}
