import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { RoomManager } from "./rooms.js";
import {
  InboundMessage,
  RoleSchema,
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

const PORT = Number(process.env.PORT ?? 3001);
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  const boardMatch = req.url?.match(/^\/board\/(.+)$/);
  if (req.method === "GET" && boardMatch) {
    const boardId = decodeURIComponent(boardMatch[1]);
    const state = loadBoardState(boardId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ boardId, columns: state.columns, cards: state.cards }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found." }));
});

const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();
const boards = new Map<string, { id: string; name: string; roomCode: string; createdAt: string }>();
const columns = new Map<string, Column[]>();
const cards = new Map<string, Card[]>();
const chatMessages = new Map<string, Array<{ id: string; userId: string; name: string; color: string; text: string; sentAt: string }>>();

function respondError(ws: WebSocket, message: string, code?: string) {
  const payload: ErrorMsg = { type: "error", message, code };
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

  const defaultColumns: Array<{ title: string; order: number }> = [
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

async function handleJoinMessage(ws: WebSocket, data: JoinRoomMsg) {
  const roleResult = RoleSchema.safeParse(data.role ?? "viewer");
  const role = roleResult.success ? roleResult.data : "viewer";

  ensureBoardExists(data.boardId);
  const client = roomManager.join(data.boardId, {
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

function getClientForSocket(ws: WebSocket) {
  return roomManager.findBySocket(ws);
}

function handleCardMove(ws: WebSocket, data: CardMoveMsg) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
    return;
  }
  if (client.role === "viewer") {
    respondError(ws, "Viewers cannot move cards.", "permission_denied");
    return;
  }

  const boardCards = cards.get(client.boardId) ?? [];
  const card = boardCards.find((item) => item.id === data.cardId);
  if (!card) {
    respondError(ws, "Card not found.", "not_found");
    return;
  }
  card.columnId = data.toColumnId;
  card.order = data.order;
  card.updatedAt = data.updatedAt;
  card.updatedBy = data.updatedBy;
  cards.set(client.boardId, boardCards);

  const broadcastPayload = {
    type: "card:move",
    cardId: data.cardId,
    toColumnId: data.toColumnId,
    order: data.order,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };

  roomManager.broadcast(client.boardId, broadcastPayload);

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

function handleCardCreate(ws: WebSocket, data: CardCreateMsg) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
    return;
  }
  if (client.role === "viewer") {
    respondError(ws, "Viewers cannot create cards.", "permission_denied");
    return;
  }

  const boardColumns = columns.get(client.boardId) ?? [];
  const fallbackColumnId = data.card.columnId || boardColumns[0]?.id;
  if (!fallbackColumnId) {
    respondError(ws, "No destination column available for the new card.", "missing_column");
    return;
  }

  const boardCards = cards.get(client.boardId) ?? [];
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

function handleCardUpdate(ws: WebSocket, data: CardUpdateMsg) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
    return;
  }
  if (client.role === "viewer") {
    respondError(ws, "Viewers cannot update cards.", "permission_denied");
    return;
  }

  const boardCards = cards.get(client.boardId) ?? [];
  const existing = boardCards.find((entry) => entry.id === data.cardId);
  if (!existing) {
    respondError(ws, "Card not found.", "not_found");
    return;
  }

  if (data.title !== undefined) existing.title = data.title;
  if (data.description !== undefined) existing.description = data.description;
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

function handleCardDelete(ws: WebSocket, data: CardDeleteMsg) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
    return;
  }
  if (client.role === "viewer") {
    respondError(ws, "Viewers cannot delete cards.", "permission_denied");
    return;
  }

  cards.set(
    client.boardId,
    (cards.get(client.boardId) ?? []).filter((card) => card.id !== data.cardId),
  );

  roomManager.broadcast(client.boardId, {
    type: "card:delete",
    cardId: data.cardId,
    updatedBy: data.updatedBy,
  });
}

function handleColumnCreate(ws: WebSocket, data: ColumnCreateMsg) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
    return;
  }
  if (client.role === "viewer") {
    respondError(ws, "Viewers cannot create columns.", "permission_denied");
    return;
  }

  const boardColumns = columns.get(client.boardId) ?? [];
  boardColumns.push({
    id: data.column.id,
    boardId: client.boardId,
    title: data.column.title,
    order: data.column.order,
  });
  columns.set(client.boardId, boardColumns);
  roomManager.broadcast(client.boardId, data);
}

function handleColumnDelete(ws: WebSocket, data: ColumnDeleteMsg) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
    return;
  }
  if (client.role === "viewer") {
    respondError(ws, "Viewers cannot delete columns.", "permission_denied");
    return;
  }

  columns.set(
    client.boardId,
    (columns.get(client.boardId) ?? []).filter((column) => column.id !== data.columnId),
  );
  cards.set(
    client.boardId,
    (cards.get(client.boardId) ?? []).filter((card) => card.columnId !== data.columnId),
  );
  roomManager.broadcast(client.boardId, data);
}

function handleRequestSync(ws: WebSocket, data: RequestSyncMsg) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
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

function handleCursorMove(ws: WebSocket, data: CursorMoveMsg) {
  const client = getClientForSocket(ws);
  if (!client) return;
  roomManager.setCursor(client.boardId, client.userId, data.x, data.y);
  roomManager.broadcast(client.boardId, {
    type: "presence:update",
    users: roomManager.listPresence(client.boardId),
  });
}

function handleHeartbeat(ws: WebSocket) {
  const client = getClientForSocket(ws);
  if (!client) return;
  roomManager.touch(client.boardId, client.userId);
}

function handleChatMessage(ws: WebSocket, data: { boardId: string; userId: string; name: string; text: string; sentAt: string }) {
  const client = getClientForSocket(ws);
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
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
    respondError(ws, "Message cannot be empty.", "empty_message");
    return;
  }

  const boardMessages = chatMessages.get(client.boardId) ?? [];
  boardMessages.push(message);
  chatMessages.set(client.boardId, boardMessages.slice(-100));

  roomManager.broadcast(client.boardId, {
    type: "chat:message",
    ...message,
  });
}

function handlePaperData(ws: WebSocket, data: { boardId: string; userId: string; paperData: string }) {
  const client = getClientForSocket(ws);  
  if (!client) {
    respondError(ws, "Not joined to a board.", "not_joined");
    return;
  }   
  roomManager.broadcast(client.boardId, {
    type: "data:paper",
    userId: client.userId,
    paperData: data.paperData,
  });
}          

function handleTypingMessage(ws: WebSocket, data: { boardId: string; userId: string; name: string; isTyping: boolean }) {
  const client = getClientForSocket(ws);
  if (!client) return;

  roomManager.broadcast(client.boardId, {
    type: "chat:typing",
    userId: client.userId,
    name: client.name,
    isTyping: data.isTyping,
  });
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let input: any;
    try {
      input = JSON.parse(raw.toString());
    } catch (error) {
      respondError(ws, "Invalid JSON payload.", "invalid_json");
      return;
    }

    const alarmType = typeof input?.type === "string" ? input.type : null;

    if (alarmType === "chat:message") {
      handleChatMessage(ws, {
        boardId: input.boardId,
        userId: input.userId,
        name: input.name,
        text: input.text,
        sentAt: input.sentAt,
      });
      return;
    }

    if (alarmType === "chat:typing") {
      handleTypingMessage(ws, {
        boardId: input.boardId,
        userId: input.userId,
        name: input.name,
        isTyping: Boolean(input.isTyping),
      });
      return;
    }

    if(input?.type === "data:paper"){
      console.log("Received paper data:", input);
      handlePaperData(ws, input);
      return;
    }

    const parseResult = InboundMessage.safeParse(input);

    if (!parseResult.success) {
      respondError(ws, "Invalid message shape.", "invalid_message");
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
        respondError(ws, "Unsupported message type.", "unsupported_type");
    }
  });

  ws.on("close", () => {
    const client = getClientForSocket(ws);
    if (!client) return;
    roomManager.leave(client.boardId, client.userId);
    roomManager.broadcast(client.boardId, {
      type: "presence:update",
      users: roomManager.listPresence(client.boardId),
    });
  });
});

setInterval(() => {
  roomManager.pruneStale(20_000);
}, 10_000);

server.listen(PORT, () => {
  console.log(`WebSocket server listening on http://localhost:${PORT}`);
});
