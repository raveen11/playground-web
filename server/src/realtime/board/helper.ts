import WebSocket from "ws";
import { RealtimeContext } from "../context.js";
import { prisma } from "../../lib/prisma.js";
import { boardService } from "../../services/board.service.js";
import { ticketService } from "../../services/ticket.service.js";
import { chatService } from "../../services/chat.service.js";

import {
  type CardCreateMsg,
  type CardDeleteMsg,
  type CardMoveMsg,
  type CardMoveAckMsg,
  type CardUpdateMsg,
  type ColumnCreateMsg,
  type ColumnDeleteMsg,
  type CursorMoveMsg,
  type JoinRoomMsg,
  type PaperMsg,
  type RequestSyncMsg,
  type SyncStateMsg,
  RoleSchema,
} from "@kanban/shared";
import { sendError } from "../error.js";

function getClient(ws: WebSocket, context: RealtimeContext) {
  return context.rooms.findBySocket(ws);
}

export function handlePaperData(
  ws: WebSocket,
  data: PaperMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);

  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  context.rooms.broadcast(client.boardId, {
    type: "data:paper",
    boardId: client.boardId,
    userId: client.userId,
    paperData: data.paperData,
  });
}

export async function handleJoinMessage(
  ws: WebSocket,
  data: JoinRoomMsg,
  context: RealtimeContext,
) {
  const roleResult = RoleSchema.safeParse(data.role ?? "viewer");
  const role = roleResult.success ? roleResult.data : "viewer";

  context.rooms.join(data.boardId, {
    ws,
    userId: data.userId,
    name: data.name,
    role,
  });

  try {
    const defaultCompany = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const companyId = defaultCompany ? defaultCompany.id : undefined;

    let dbBoard = null;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.boardId,
      );

    if (isUuid) {
      dbBoard = await boardService.getBoard(data.boardId, companyId);
    }
    if (!dbBoard && companyId) {
      dbBoard = await boardService.ensureDefaultBoard(companyId);
    }

    if (dbBoard) {
      const columns = dbBoard.columns.map((c) => ({
        id: c.id,
        boardId: data.boardId,
        title: c.name,
        order: c.position,
      }));

      const cards = dbBoard.columns.flatMap((c) =>
        c.tickets.map((t) => ({
          id: t.id,
          columnId: t.columnId,
          title: t.title,
          description: t.description,
          order: String(t.position),
          position: t.position,
          priority: t.priority,
          status: t.status,
          assigneeId: t.assigneeId,
          assignee: t.assignee,
          updatedAt: t.updatedAt.toISOString(),
          updatedBy: t.assignee?.name || "system",
        })),
      );

      context.boardState.setColumns(data.boardId, columns);
      context.boardState.setCards(data.boardId, cards);

      const sync: SyncStateMsg = {
        type: "sync:state",
        columns,
        cards,
        seq: context.rooms.nextSeq(data.boardId),
      };

      context.rooms.send(ws, sync);

      if (companyId) {
        const chatMessages = await chatService.listMessages(
          companyId,
          isUuid ? data.boardId : undefined,
          100,
        );

        context.rooms.send(ws, {
          type: "chat:history",
          messages: chatMessages.map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.name,
            color: "#64748b",
            text: m.text,
            sentAt: m.sentAt,
          })),
        });
      }
    } else {
      context.boardState.ensureBoard(data.boardId);
      const state = context.boardState.getBoardState(data.boardId);
      context.rooms.send(ws, {
        type: "sync:state",
        columns: state.columns,
        cards: state.cards,
        seq: context.rooms.nextSeq(data.boardId),
      });
      context.rooms.send(ws, {
        type: "chat:history",
        messages: context.boardState.getChat(data.boardId),
      });
    }
  } catch (error) {
    console.error("Error loading board from DB during join:", error);
    context.boardState.ensureBoard(data.boardId);
    const state = context.boardState.getBoardState(data.boardId);
    context.rooms.send(ws, {
      type: "sync:state",
      columns: state.columns,
      cards: state.cards,
      seq: context.rooms.nextSeq(data.boardId),
    });
  }

  context.rooms.broadcast(data.boardId, {
    type: "presence:update",
    users: context.rooms.listPresence(data.boardId),
  });
}

export function handleHeartbeat(ws: WebSocket, context: RealtimeContext) {
  const client = getClient(ws, context);
  if (!client) return;
  context.rooms.touch(client.boardId, client.userId);
}

export async function handleCardMove(
  ws: WebSocket,
  data: CardMoveMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);
  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  if (client.role === "viewer") {
    sendError(ws, "Viewers cannot move cards.", "permission_denied");
    return;
  }

  try {
    const defaultCompany = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (defaultCompany) {
      const isCardUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          data.cardId,
        );
      const isColUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          data.toColumnId,
        );

      if (isCardUuid && isColUuid) {
        await ticketService.moveTicket(data.cardId, defaultCompany.id, {
          toColumnId: data.toColumnId,
          position: Math.max(0, parseInt(data.order, 10) || 0),
        });
      }
    }
  } catch (err) {
    console.error("handleCardMove DB error:", err);
  }

  const boardCards = context.boardState.getCards(client.boardId);
  const card = boardCards.find((item) => item.id === data.cardId);

  if (card) {
    card.columnId = data.toColumnId;
    card.order = data.order;
    card.updatedAt = data.updatedAt;
    card.updatedBy = data.updatedBy;
    context.boardState.setCards(client.boardId, boardCards);
  }

  context.rooms.broadcast(client.boardId, {
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
    seq: context.rooms.nextSeq(client.boardId),
  };

  context.rooms.send(ws, ack);
}

export async function handleCardCreate(
  ws: WebSocket,
  data: CardCreateMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);
  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  if (client.role === "viewer") {
    sendError(ws, "Viewers cannot create cards.", "permission_denied");
    return;
  }

  let cardId = data.card.id;
  let columnId = data.card.columnId;

  try {
    const defaultCompany = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (defaultCompany) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          client.boardId,
        );
      let boardId = client.boardId;
      if (!isUuid) {
        const defaultBoard = await boardService.ensureDefaultBoard(
          defaultCompany.id,
        );
        if (defaultBoard) {
          boardId = defaultBoard.id;
        }
      }

      const board = await boardService.getBoard(boardId, defaultCompany.id);
      const targetColumn =
        board?.columns.find((c) => c.id === data.card.columnId) ||
        board?.columns[0];

      if (targetColumn) {
        const ticket = await ticketService.createTicket(defaultCompany.id, {
          boardId,
          columnId: targetColumn.id,
          title: data.card.title,
          description: data.card.description,
          position: targetColumn.tickets.length,
        });

        cardId = ticket.id;
        columnId = ticket.columnId;
      }
    }
  } catch (err) {
    console.error("handleCardCreate DB error:", err);
  }

  const boardCards = context.boardState.getCards(client.boardId);
  const nextCard = {
    ...data.card,
    id: cardId,
    columnId,
    updatedAt: new Date().toISOString(),
    updatedBy: data.updatedBy,
  };

  boardCards.push(nextCard);
  context.boardState.setCards(client.boardId, boardCards);

  context.rooms.broadcast(client.boardId, {
    type: "card:create",
    card: nextCard,
    updatedBy: data.updatedBy,
  });
}

export async function handleCardUpdate(
  ws: WebSocket,
  data: CardUpdateMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);
  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  if (client.role === "viewer") {
    sendError(ws, "Viewers cannot update cards.", "permission_denied");
    return;
  }

  try {
    const defaultCompany = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const isCardUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.cardId,
      );

    if (defaultCompany && isCardUuid) {
      await ticketService.updateTicket(data.cardId, defaultCompany.id, {
        title: data.title,
        description: data.description,
      });
    }
  } catch (err) {
    console.error("handleCardUpdate DB error:", err);
  }

  const boardCards = context.boardState.getCards(client.boardId);
  const card = boardCards.find((item) => item.id === data.cardId);

  if (card) {
    if (data.title !== undefined) card.title = data.title;
    if (data.description !== undefined) card.description = data.description;
    card.updatedAt = data.updatedAt;
    card.updatedBy = data.updatedBy;
    context.boardState.setCards(client.boardId, boardCards);
  }

  context.rooms.broadcast(client.boardId, {
    type: "card:update",
    cardId: data.cardId,
    title: data.title,
    description: data.description,
    updatedBy: data.updatedBy,
    updatedAt: data.updatedAt,
  });
}

export async function handleCardDelete(
  ws: WebSocket,
  data: CardDeleteMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);
  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  if (client.role === "viewer") {
    sendError(ws, "Viewers cannot delete cards.", "permission_denied");
    return;
  }

  try {
    const defaultCompany = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const isCardUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.cardId,
      );

    if (defaultCompany && isCardUuid) {
      await ticketService.deleteTicket(data.cardId, defaultCompany.id);
    }
  } catch (err) {
    console.error("handleCardDelete DB error:", err);
  }

  const cards = context.boardState
    .getCards(client.boardId)
    .filter((card) => card.id !== data.cardId);

  context.boardState.setCards(client.boardId, cards);

  context.rooms.broadcast(client.boardId, {
    type: "card:delete",
    cardId: data.cardId,
    updatedBy: data.updatedBy,
  });
}

export function handleColumnDelete(
  ws: WebSocket,
  data: ColumnDeleteMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);
  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  if (client.role === "viewer") {
    sendError(ws, "Viewers cannot delete columns.", "permission_denied");
    return;
  }

  const columns = context.boardState
    .getColumns(client.boardId)
    .filter((column) => column.id !== data.columnId);

  const cards = context.boardState
    .getCards(client.boardId)
    .filter((card) => card.columnId !== data.columnId);

  context.boardState.setColumns(client.boardId, columns);
  context.boardState.setCards(client.boardId, cards);

  context.rooms.broadcast(client.boardId, data);
}

export function handleRequestSync(
  ws: WebSocket,
  data: RequestSyncMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);
  if (!client) {
    sendError(ws, "Not joined to a board.", "not_joined");
    return;
  }

  const state = context.boardState.getBoardState(data.boardId);

  const sync: SyncStateMsg = {
    type: "sync:state",
    columns: state.columns,
    cards: state.cards,
    seq: context.rooms.nextSeq(data.boardId),
  };

  context.rooms.send(ws, sync);
}

export function handleCursorMove(
  ws: WebSocket,
  data: CursorMoveMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);
  if (!client) return;

  context.rooms.setCursor(
    client.boardId,
    client.userId,
    data.x,
    data.y,
  );

  context.rooms.broadcast(client.boardId, {
    type: "presence:update",
    users: context.rooms.listPresence(client.boardId),
  });
}
