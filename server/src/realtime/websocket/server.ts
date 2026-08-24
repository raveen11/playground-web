import { WebSocketServer, type WebSocket } from "ws";
import { RoomManager } from "../board/room-manager.js";
import { WhiteboardManager } from "../whiteboard/whiteboard-manager.js";

import {
  InboundMessage,
  RoleSchema,
  WhiteboardJoinMsg,
  WhiteboardLeaveMsg,
  WhiteboardOperationMsg,
} from "@kanban/shared";

import type {
  CardCreateMsg,
  CardDeleteMsg,
  CardMoveMsg,
  CardMoveAckMsg,
  CardUpdateMsg,
  ColumnCreateMsg,
  ColumnDeleteMsg,
  CursorMoveMsg,
  ErrorMsg,
  JoinRoomMsg,
  RequestSyncMsg,
  SyncStateMsg,
  Card,
  Column,
} from "@kanban/shared";

import "dotenv/config";

const WS_PORT = Number(process.env.WS_PORT ?? 3002);

export const wss = new WebSocketServer({
  port: WS_PORT,
});

console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);

const roomManager = new RoomManager();
const whiteboardManager = new WhiteboardManager();

const boards = new Map<
  string,
  {
    id: string;
    name: string;
    roomCode: string;
    createdAt: string;
  }
>();

const columns = new Map<string, Column[]>();
const cards = new Map<string, Card[]>();

const chatMessages = new Map<
  string,
  Array<{
    id: string;
    userId: string;
    name: string;
    color: string;
    text: string;
    sentAt: string;
  }>
>();

// ============================================================================
// HELPERS
// ============================================================================

function respondError(
  ws: WebSocket,
  message: string,
  code?: string,
) {
  const payload: ErrorMsg = {
    type: "error",
    message,
    code,
  };

  ws.send(JSON.stringify(payload));
}

function ensureBoardExists(boardId: string) {
  const existing = boards.get(boardId);

  if (existing) return;

  const now = new Date().toISOString();

  boards.set(boardId, {
    id: boardId,
    name: `Board ${boardId}`,
    roomCode: boardId.slice(0, 8),
    createdAt: now,
  });

  const defaultColumns: Array<{
    title: string;
    order: number;
  }> = [
    { title: "Todo", order: 10 },
    { title: "In Progress", order: 20 },
    { title: "Done", order: 30 },
  ];

  const newColumns: Column[] = defaultColumns.map((column) => ({
    id: crypto.randomUUID(),
    boardId,
    title: column.title,
    order: column.order,
  }));

  columns.set(boardId, newColumns);

  const nowStr = new Date().toISOString();

  const newCards: Card[] = newColumns.map((column, index) => ({
    id: crypto.randomUUID(),
    columnId: column.id,
    title: `Example card ${index + 1}`,
    description: "This item is shared in real time.",
    order: String(index * 10),
    updatedAt: nowStr,
    updatedBy: "system",
  }));

  cards.set(boardId, newCards);
}

function loadBoardState(boardId: string) {
  return {
    columns: columns.get(boardId) ?? [],
    cards: cards.get(boardId) ?? [],
  };
}

function loadBoardChat(boardId: string) {
  return chatMessages.get(boardId) ?? [];
}

function getClientForSocket(ws: WebSocket) {
  return roomManager.findBySocket(ws);
}

// ============================================================================
// ROOM
// ============================================================================

async function handleJoinMessage(
  ws: WebSocket,
  data: JoinRoomMsg,
) {
  const roleResult = RoleSchema.safeParse(
    data.role ?? "viewer",
  );

  const role = roleResult.success
    ? roleResult.data
    : "viewer";

  ensureBoardExists(data.boardId);

  roomManager.join(data.boardId, {
    ws,
    userId: data.userId,
    name: data.name,
    role,
  });

  const state = loadBoardState(data.boardId);

  const sync: SyncStateMsg = {
    type: "sync:state",
    columns: state.columns,
    cards: state.cards,
    seq: roomManager.nextSeq(data.boardId),
  };

  roomManager.send(ws, sync);

  roomManager.send(ws, {
    type: "chat:history",
    messages: loadBoardChat(data.boardId),
  });

  roomManager.broadcast(data.boardId, {
    type: "presence:update",
    users: roomManager.listPresence(data.boardId),
  });
}

// ============================================================================
// CARD
// ============================================================================

function handleCardMove(
  ws: WebSocket,
  data: CardMoveMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    respondError(
      ws,
      "Viewers cannot move cards.",
      "permission_denied",
    );
    return;
  }

  const boardCards = cards.get(client.boardId) ?? [];

  const card = boardCards.find(
    (item) => item.id === data.cardId,
  );

  if (!card) {
    respondError(
      ws,
      "Card not found.",
      "not_found",
    );
    return;
  }

  card.columnId = data.toColumnId;
  card.order = data.order;
  card.updatedAt = data.updatedAt;
  card.updatedBy = data.updatedBy;

  cards.set(client.boardId, boardCards);

  roomManager.broadcast(client.boardId, {
    type: "card:move",
    cardId: data.cardId,
    toColumnId: data.toColumnId,
    order: data.order,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  });

  const ack: CardMoveAckMsg = {
    type: "card:move:ack",
    cardId: data.cardId,
    toColumnId: data.toColumnId,
    order: data.order,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    accepted: true,
    seq: roomManager.nextSeq(client.boardId),
  };

  roomManager.send(ws, ack);
}

function handleCardCreate(
  ws: WebSocket,
  data: CardCreateMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    respondError(
      ws,
      "Viewers cannot create cards.",
      "permission_denied",
    );
    return;
  }

  const boardColumns =
    columns.get(client.boardId) ?? [];

  const fallbackColumnId =
    data.card.columnId || boardColumns[0]?.id;

  if (!fallbackColumnId) {
    respondError(
      ws,
      "No destination column available for the new card.",
      "missing_column",
    );
    return;
  }

  const boardCards =
    cards.get(client.boardId) ?? [];

  const nextCard: Card = {
    ...data.card,
    columnId: fallbackColumnId,
    updatedAt: new Date().toISOString(),
    updatedBy: data.updatedBy,
  };

  boardCards.push(nextCard);

  cards.set(client.boardId, boardCards);

  roomManager.broadcast(client.boardId, {
    type: "card:create",
    card: nextCard,
    updatedBy: data.updatedBy,
  });
}

function handleCardUpdate(
  ws: WebSocket,
  data: CardUpdateMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    respondError(
      ws,
      "Viewers cannot update cards.",
      "permission_denied",
    );
    return;
  }

  const boardCards =
    cards.get(client.boardId) ?? [];

  const existing = boardCards.find(
    (entry) => entry.id === data.cardId,
  );

  if (!existing) {
    respondError(
      ws,
      "Card not found.",
      "not_found",
    );
    return;
  }

  if (data.title !== undefined) {
    existing.title = data.title;
  }

  if (data.description !== undefined) {
    existing.description = data.description;
  }

  existing.updatedAt = data.updatedAt;
  existing.updatedBy = data.updatedBy;

  cards.set(client.boardId, boardCards);

  roomManager.broadcast(client.boardId, {
    type: "card:update",
    cardId: data.cardId,
    title: data.title,
    description: data.description,
    updatedBy: data.updatedBy,
    updatedAt: data.updatedAt,
  });
}

function handleCardDelete(
  ws: WebSocket,
  data: CardDeleteMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    respondError(
      ws,
      "Viewers cannot delete cards.",
      "permission_denied",
    );
    return;
  }

  cards.set(
    client.boardId,
    (cards.get(client.boardId) ?? []).filter(
      (card) => card.id !== data.cardId,
    ),
  );

  roomManager.broadcast(client.boardId, {
    type: "card:delete",
    cardId: data.cardId,
    updatedBy: data.updatedBy,
  });
}

// ============================================================================
// COLUMN
// ============================================================================

function handleColumnCreate(
  ws: WebSocket,
  data: ColumnCreateMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    respondError(
      ws,
      "Viewers cannot create columns.",
      "permission_denied",
    );
    return;
  }

  const boardColumns =
    columns.get(client.boardId) ?? [];

  boardColumns.push({
    id: data.column.id,
    boardId: client.boardId,
    title: data.column.title,
    order: data.column.order,
  });

  columns.set(client.boardId, boardColumns);

  roomManager.broadcast(
    client.boardId,
    data,
  );
}

function handleColumnDelete(
  ws: WebSocket,
  data: ColumnDeleteMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    respondError(
      ws,
      "Viewers cannot delete columns.",
      "permission_denied",
    );
    return;
  }

  columns.set(
    client.boardId,
    (columns.get(client.boardId) ?? []).filter(
      (column) => column.id !== data.columnId,
    ),
  );

  cards.set(
    client.boardId,
    (cards.get(client.boardId) ?? []).filter(
      (card) => card.columnId !== data.columnId,
    ),
  );

  roomManager.broadcast(
    client.boardId,
    data,
  );
}

// ============================================================================
// SYNC / CURSOR / HEARTBEAT
// ============================================================================

function handleRequestSync(
  ws: WebSocket,
  data: RequestSyncMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  const state = loadBoardState(data.boardId);

  const sync: SyncStateMsg = {
    type: "sync:state",
    columns: state.columns,
    cards: state.cards,
    seq: roomManager.nextSeq(data.boardId),
  };

  roomManager.send(ws, sync);
}

function handleCursorMove(
  ws: WebSocket,
  data: CursorMoveMsg,
) {
  const client = getClientForSocket(ws);

  if (!client) return;

  roomManager.setCursor(
    client.boardId,
    client.userId,
    data.x,
    data.y,
  );

  roomManager.broadcast(client.boardId, {
    type: "presence:update",
    users: roomManager.listPresence(
      client.boardId,
    ),
  });
}

function handleHeartbeat(ws: WebSocket) {
  const client = getClientForSocket(ws);

  if (!client) return;

  roomManager.touch(
    client.boardId,
    client.userId,
  );
}

// ============================================================================
// CHAT
// ============================================================================

function handleChatMessage(
  ws: WebSocket,
  data: {
    boardId: string;
    userId: string;
    name: string;
    text: string;
    sentAt: string;
  },
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  const message = {
    id: crypto.randomUUID(),
    userId: client.userId,
    name: client.name,
    color: client.color,
    text: data.text.trim(),
    sentAt: data.sentAt,
  };

  if (!message.text) {
    respondError(
      ws,
      "Message cannot be empty.",
      "empty_message",
    );
    return;
  }

  const boardMessages =
    chatMessages.get(client.boardId) ?? [];

  boardMessages.push(message);

  chatMessages.set(
    client.boardId,
    boardMessages.slice(-100),
  );

  roomManager.broadcast(client.boardId, {
    type: "chat:message",
    ...message,
  });
}

function handlePaperData(
  ws: WebSocket,
  data: {
    boardId: string;
    userId: string;
    paperData: string;
  },
) {
  const client = getClientForSocket(ws);

  if (!client) {
    respondError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  roomManager.broadcast(client.boardId, {
    type: "data:paper",
    userId: client.userId,
    paperData: data.paperData,
  });
}

function handleTypingMessage(
  ws: WebSocket,
  data: {
    boardId: string;
    userId: string;
    name: string;
    isTyping: boolean;
  },
) {
  const client = getClientForSocket(ws);

  if (!client) return;

  roomManager.broadcast(client.boardId, {
    type: "chat:typing",
    userId: client.userId,
    name: client.name,
    isTyping: data.isTyping,
  });
}

// ============================================================================
// WHITEBOARD
// ============================================================================

function whiteboardRoomKey(whiteboardId: string) {
  return `whiteboard:${whiteboardId}`;
}

function leaveWhiteboardRoom(ws: WebSocket, whiteboardId?: string) {
  const membership = whiteboardsBySocket.get(ws);
  const target = whiteboardId ?? membership?.whiteboardId;
  if (!target) return;
  const room = roomsByDocument.get(whiteboardRoomKey(target));
  room?.delete(ws);
  if (room?.size === 0) roomsByDocument.delete(whiteboardRoomKey(target));
  if (membership?.whiteboardId === target) whiteboardsBySocket.delete(ws);
}

function handleWhiteboardJoin(ws: WebSocket, data: import("@kanban/shared").WhiteboardJoinMsg) {
  leaveWhiteboardRoom(ws);
  const roomKey = whiteboardRoomKey(data.whiteboardId);
  const room = roomsByDocument.get(roomKey) ?? new Set<WebSocket>();
  room.add(ws);
  roomsByDocument.set(roomKey, room);
  whiteboardsBySocket.set(ws, { whiteboardId: data.whiteboardId, userId: data.userId });

  const document = whiteboardManager.getDocument(data.whiteboardId, data.userId);
  const currentVersion = whiteboardManager.getVersion(data.whiteboardId);
  if (
    data.lastVersion === 0 ||
    data.lastVersion > currentVersion ||
    !whiteboardManager.canReplayFrom(data.whiteboardId, data.lastVersion)
  ) {
    roomManager.send(ws, { type: "document.snapshot", document });
    return;
  }
  roomManager.send(ws, {
    type: "whiteboard:sync",
    whiteboardId: data.whiteboardId,
    operations: whiteboardManager.getOperationsSince(data.whiteboardId, data.lastVersion),
  });
}

function handleWhiteboardOperation(
  ws: WebSocket,
  data: import("@kanban/shared").WhiteboardOperationMsg,
) {
  try {
    const envelope = data.operation;
    const membership = whiteboardsBySocket.get(ws);
    if (!membership || membership.whiteboardId !== envelope.documentId) {
      respondError(ws, "Join the whiteboard before sending operations.", "whiteboard_not_joined");
      return;
    }
    if (membership.userId !== envelope.userId) {
      respondError(ws, "Operation user does not match the joined user.", "whiteboard_user_mismatch");
      return;
    }

    const serverOp =
      whiteboardManager.applyOperation(
        envelope.documentId,
        envelope,
      );

    if (!serverOp) {
      respondError(
        ws,
        "Failed to apply operation.",
        "operation_failed",
      );
      return;
    }

    const room = roomsByDocument.get(whiteboardRoomKey(envelope.documentId));

    for (const clientWs of room ?? []) {
      if (
        clientWs.readyState === clientWs.OPEN
      ) {
        clientWs.send(
          JSON.stringify({
            type: "operation",
            operation: serverOp,
          }),
        );
      }
    }

    console.log(
      `Operation ${serverOp.operationId} applied to document ${envelope.documentId} at version ${serverOp.serverVersion}`,
    );
  } catch (error) {
    console.error(
      "Error handling operation:",
      error,
    );

    respondError(
      ws,
      "Invalid operation.",
      "invalid_operation",
    );
  }
}

// ============================================================================
// DOCUMENT ROOMS
// ============================================================================

const roomsByDocument =
  new Map<string, Set<WebSocket>>();
const whiteboardsBySocket = new Map<WebSocket, { whiteboardId: string; userId: string }>();

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let input: unknown;

    try {
      input = JSON.parse(raw.toString());
    } catch {
      respondError(
        ws,
        "Invalid JSON payload.",
        "invalid_json",
      );
      return;
    }

    const messageType =
      typeof input === "object" && input !== null && "type" in input && typeof input.type === "string"
        ? input.type
        : null;
    const legacyInput = input as {
      boardId: string;
      userId: string;
      name: string;
      text: string;
      sentAt: string;
      isTyping: boolean;
      paperData: string;
    };

    // --------------------------------------------------
    // Chat
    // --------------------------------------------------

    if (messageType === "chat:message") {
      handleChatMessage(ws, {
        boardId: legacyInput.boardId,
        userId: legacyInput.userId,
        name: legacyInput.name,
        text: legacyInput.text,
        sentAt: legacyInput.sentAt,
      });

      return;
    }

    if (messageType === "chat:typing") {
      handleTypingMessage(ws, {
        boardId: legacyInput.boardId,
        userId: legacyInput.userId,
        name: legacyInput.name,
        isTyping: Boolean(legacyInput.isTyping),
      });

      return;
    }

    // --------------------------------------------------
    // Paper
    // --------------------------------------------------

    if (messageType === "data:paper") {
      handlePaperData(ws, legacyInput);
      return;
    }

    // --------------------------------------------------
    // Whiteboard
    // --------------------------------------------------

    if (messageType === "whiteboard:join") {
      const parsed = WhiteboardJoinMsg.safeParse(input);
      if (!parsed.success) {
        respondError(ws, "Invalid whiteboard join message.", "invalid_whiteboard_join");
        return;
      }
      handleWhiteboardJoin(ws, parsed.data);
      return;
    }

    if (messageType === "whiteboard:leave") {
      const parsed = WhiteboardLeaveMsg.safeParse(input);
      if (!parsed.success) {
        respondError(ws, "Invalid whiteboard leave message.", "invalid_whiteboard_leave");
        return;
      }
      leaveWhiteboardRoom(ws, parsed.data.whiteboardId);
      return;
    }

    if (messageType === "whiteboard:operation") {
      const parsed = WhiteboardOperationMsg.safeParse(input);
      if (!parsed.success) {
        respondError(ws, "Invalid whiteboard operation.", "invalid_whiteboard_operation");
        return;
      }
      handleWhiteboardOperation(ws, parsed.data);
      return;
    }

    // --------------------------------------------------
    // Normal board messages
    // --------------------------------------------------

    const parseResult =
      InboundMessage.safeParse(input);

    if (!parseResult.success) {
      respondError(
        ws,
        "Invalid message shape.",
        "invalid_message",
      );
      return;
    }

    const data = parseResult.data;

    switch (data.type) {
      case "room:join":
        handleJoinMessage(ws, data);
        break;

      case "heartbeat":
        handleHeartbeat(ws);
        break;

      case "sync:request":
        handleRequestSync(ws, data);
        break;

      case "cursor:move":
        handleCursorMove(ws, data);
        break;

      case "card:move":
        handleCardMove(ws, data);
        break;

      case "card:create":
        handleCardCreate(ws, data);
        break;

      case "card:update":
        handleCardUpdate(ws, data);
        break;

      case "card:delete":
        handleCardDelete(ws, data);
        break;

      case "column:create":
        handleColumnCreate(ws, data);
        break;

      case "column:delete":
        handleColumnDelete(ws, data);
        break;

      case "data:paper":
        handlePaperData(ws, data);
        break;

      default:
        respondError(
          ws,
          "Unsupported message type.",
          "unsupported_type",
        );
    }
  });

  ws.on("close", () => {
    leaveWhiteboardRoom(ws);
    const client = getClientForSocket(ws);

    if (!client) return;

    roomManager.leave(
      client.boardId,
      client.userId,
    );

    roomManager.broadcast(
      client.boardId,
      {
        type: "presence:update",
        users: roomManager.listPresence(
          client.boardId,
        ),
      },
    );
  });
});

// ============================================================================
// CLEANUP
// ============================================================================

setInterval(() => {
  roomManager.pruneStale(20_000);
}, 10_000);
