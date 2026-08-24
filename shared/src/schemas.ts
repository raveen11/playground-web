import { z } from "zod";

export const CursorMoveMsg = z.object({
  type: z.literal("cursor:move"),
  userId: z.string(),
  x: z.number(),
  y: z.number(),
});

export const RoleSchema = z.enum(["viewer", "editor", "admin"]);

export const CardMoveMsg = z.object({
  type: z.literal("card:move"),
  cardId: z.string(),
  toColumnId: z.string(),
  order: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
});

export const CardCreateMsg = z.object({
  type: z.literal("card:create"),
  card: z.object({
    id: z.string(),
    columnId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    order: z.string(),
  }),
  updatedBy: z.string(),
});

export const CardUpdateMsg = z.object({
  type: z.literal("card:update"),
  cardId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  updatedBy: z.string(),
  updatedAt: z.string(),
});

export const CardDeleteMsg = z.object({
  type: z.literal("card:delete"),
  cardId: z.string(),
  updatedBy: z.string(),
});

export const ColumnCreateMsg = z.object({
  type: z.literal("column:create"),
  column: z.object({
    id: z.string(),
    title: z.string(),
    order: z.number(),
  }),
  updatedBy: z.string(),
});

export const ColumnDeleteMsg = z.object({
  type: z.literal("column:delete"),
  columnId: z.string(),
  updatedBy: z.string(),
});

export const JoinRoomMsg = z.object({
  type: z.literal("room:join"),
  boardId: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(32),
  role: RoleSchema.optional(),
});

export const HeartbeatMsg = z.object({
  type: z.literal("heartbeat"),
  userId: z.string(),
});

export const ChatMessageEvent = z.object({
  type: z.literal("chat:message"),
  boardId: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(32),
  text: z.string().min(1).max(500),
  sentAt: z.string(),
});

export const TypingEvent = z.object({
  type: z.literal("chat:typing"),
  boardId: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(32),
  isTyping: z.boolean(),
});

export const RequestSyncMsg = z.object({
  type: z.literal("sync:request"),
  boardId: z.string(),
});

export const PaperMsg = z.object({
  type: z.literal("data:paper"),
  boardId: z.string(),
  userId: z.string(),
  paperData: z.string(),
});

const PositionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const SizeSchema = z.object({ width: z.number().positive(), height: z.number().positive() });
const ElementStyleSchema = z.object({
  fillColor: z.string().optional(), strokeColor: z.string().optional(), strokeWidth: z.number().positive().optional(),
  fontSize: z.number().positive().optional(), color: z.string().optional(), bold: z.boolean().optional(),
  italic: z.boolean().optional(), underline: z.boolean().optional(), bullet: z.boolean().optional(),
});
const CodeLanguageSchema = z.enum(["typescript", "javascript", "python", "json", "sql", "markdown", "html", "css"]);
const WhiteboardElementSchema = z.object({
  id: z.string().min(1), type: z.enum(["rectangle", "circle", "text", "line", "drawing", "code"]), position: PositionSchema,
  size: SizeSchema.optional(), rotation: z.number().finite().optional(), content: z.string().optional(),
  language: CodeLanguageSchema.optional(), title: z.string().max(120).optional(),
  createdBy: z.string().min(1), createdAt: z.number().int().nonnegative(), updatedAt: z.number().int().nonnegative(),
  updatedBy: z.string().min(1), style: ElementStyleSchema.optional(),
});
const WhiteboardOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("element.create"), element: WhiteboardElementSchema }),
  z.object({ type: z.literal("element.update"), elementId: z.string().min(1), changes: z.object({ position: PositionSchema.optional(), size: SizeSchema.optional(), rotation: z.number().finite().optional(), content: z.string().optional(), language: CodeLanguageSchema.optional(), title: z.string().max(120).optional(), updatedAt: z.number().int().nonnegative().optional(), updatedBy: z.string().min(1).optional(), style: ElementStyleSchema.optional() }) }),
  z.object({ type: z.literal("element.move"), elementId: z.string().min(1), position: PositionSchema }),
  z.object({ type: z.literal("element.resize"), elementId: z.string().min(1), size: SizeSchema }),
  z.object({ type: z.literal("element.rotate"), elementId: z.string().min(1), rotation: z.number().finite() }),
  z.object({ type: z.literal("element.delete"), elementId: z.string().min(1) }),
  z.object({ type: z.literal("text.update"), elementId: z.string().min(1), content: z.string() }),
  z.object({ type: z.literal("style.update"), elementId: z.string().min(1), style: ElementStyleSchema }),
]);

export const WhiteboardJoinMsg = z.object({ type: z.literal("whiteboard:join"), whiteboardId: z.string().min(1), userId: z.string().min(1), lastVersion: z.number().int().nonnegative() });
export const WhiteboardLeaveMsg = z.object({ type: z.literal("whiteboard:leave"), whiteboardId: z.string().min(1) });
export const WhiteboardOperationMsg = z.object({
  type: z.literal("whiteboard:operation"),
  operation: z.object({ operationId: z.string().min(1), documentId: z.string().min(1), userId: z.string().min(1), version: z.number().int().nonnegative(), timestamp: z.number().int().nonnegative(), operation: WhiteboardOperationSchema }),
});

export const InboundMessage = z.discriminatedUnion("type", [
  CursorMoveMsg,
  CardMoveMsg,
  CardCreateMsg,
  CardUpdateMsg,
  CardDeleteMsg,
  ColumnCreateMsg,
  ColumnDeleteMsg,
  JoinRoomMsg,
  HeartbeatMsg,
  ChatMessageEvent,
  TypingEvent,
  RequestSyncMsg,
  PaperMsg,
]);

export const PresenceUser = z.object({
  userId: z.string(),
  name: z.string(),
  role: RoleSchema,
  color: z.string(),
  cursor: z.object({ x: z.number(), y: z.number() }).nullable(),
});

export const PresenceUpdateMsg = z.object({
  type: z.literal("presence:update"),
  users: z.array(PresenceUser),
});

export const CardSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  order: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});

export const ColumnSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  title: z.string(),
  order: z.number(),
});

export const SyncStateMsg = z.object({
  type: z.literal("sync:state"),
  columns: z.array(ColumnSchema),
  cards: z.array(CardSchema),
  seq: z.number(),
});

export const CardMoveAckMsg = z.object({
  type: z.literal("card:move:ack"),
  cardId: z.string(),
  toColumnId: z.string(),
  order: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  accepted: z.boolean(),
  seq: z.number(),
});

export const ErrorMsg = z.object({
  type: z.literal("error"),
  message: z.string(),
  code: z.string().optional(),
});

export const ChatHistoryMsg = z.object({
  type: z.literal("chat:history"),
  messages: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      name: z.string(),
      color: z.string(),
      text: z.string(),
      sentAt: z.string(),
    }),
  ),
});

export const OutboundMessage = z.discriminatedUnion("type", [
  PresenceUpdateMsg,
  SyncStateMsg,
  CardMoveAckMsg,
  CardMoveMsg,
  CardCreateMsg,
  CardUpdateMsg,
  CardDeleteMsg,
  ColumnCreateMsg,
  ColumnDeleteMsg,
  CursorMoveMsg,
  ErrorMsg,
  ChatHistoryMsg,
  ChatMessageEvent.extend({
    color: z.string().optional(),
    id: z.string().optional(),
  }),
  TypingEvent,
]);

export type PaperMsg = z.infer<typeof PaperMsg>;
export type CursorMoveMsg = z.infer<typeof CursorMoveMsg>;
export type CardMoveMsg = z.infer<typeof CardMoveMsg>;
export type CardCreateMsg = z.infer<typeof CardCreateMsg>;
export type CardUpdateMsg = z.infer<typeof CardUpdateMsg>;
export type CardDeleteMsg = z.infer<typeof CardDeleteMsg>;
export type ColumnCreateMsg = z.infer<typeof ColumnCreateMsg>;
export type ColumnDeleteMsg = z.infer<typeof ColumnDeleteMsg>;
export type JoinRoomMsg = z.infer<typeof JoinRoomMsg>;
export type HeartbeatMsg = z.infer<typeof HeartbeatMsg>;
export type ChatMessageEvent = z.infer<typeof ChatMessageEvent>;
export type TypingEvent = z.infer<typeof TypingEvent>;
export type RequestSyncMsg = z.infer<typeof RequestSyncMsg>;
export type PresenceUser = z.infer<typeof PresenceUser>;
export type SyncStateMsg = z.infer<typeof SyncStateMsg>;
export type CardMoveAckMsg = z.infer<typeof CardMoveAckMsg>;
export type ErrorMsg = z.infer<typeof ErrorMsg>;
export type ChatHistoryMsg = z.infer<typeof ChatHistoryMsg>;
export type InboundMessage = z.infer<typeof InboundMessage>;
export type OutboundMessage = z.infer<typeof OutboundMessage>;
export type Card = z.infer<typeof CardSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type WhiteboardJoinMsg = z.infer<typeof WhiteboardJoinMsg>;
export type WhiteboardLeaveMsg = z.infer<typeof WhiteboardLeaveMsg>;
export type WhiteboardOperationMsg = z.infer<typeof WhiteboardOperationMsg>;
