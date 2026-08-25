import WebSocket from "ws";
import { RealtimeContext } from "../context.js";

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

function getClient(
  ws: WebSocket,
  context: RealtimeContext,
) {
  return context.rooms.findBySocket(ws);
}

export function handlePaperData(
  ws: WebSocket,
  data: PaperMsg,
  context: RealtimeContext,
) {
  const client = getClient(ws, context);

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  context.rooms.broadcast(client.boardId, {
    type: "data:paper",
    boardId: client.boardId,
    userId: client.userId,
    paperData: data.paperData,
  });
}

export function handleJoinMessage(
  ws: WebSocket,
  data: JoinRoomMsg,
  context: RealtimeContext,
) {
  const roleResult =
    RoleSchema.safeParse(
      data.role ?? "viewer",
    );

  const role =
    roleResult.success
      ? roleResult.data
      : "viewer";

  context.boardState.ensureBoard(
    data.boardId,
  );

  context.rooms.join(
    data.boardId,
    {
      ws,
      userId: data.userId,
      name: data.name,
      role,
    },
  );

  const state =
    context.boardState.getBoardState(
      data.boardId,
    );

  const sync: SyncStateMsg = {
    type: "sync:state",
    columns: state.columns,
    cards: state.cards,
    seq: context.rooms.nextSeq(
      data.boardId,
    ),
  };

  context.rooms.send(
    ws,
    sync,
  );

  context.rooms.send(
    ws,
    {
      type: "chat:history",
      messages:
        context.boardState.getChat(
          data.boardId,
        ),
    },
  );

  context.rooms.broadcast(
    data.boardId,
    {
      type: "presence:update",
      users:
        context.rooms.listPresence(
          data.boardId,
        ),
    },
  );
}

export function handleHeartbeat(
  ws: WebSocket,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    return;
  }

  context.rooms.touch(
    client.boardId,
    client.userId,
  );
}

export function handleCardMove(
  ws: WebSocket,
  data: CardMoveMsg,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    sendError(
      ws,
      "Viewers cannot move cards.",
      "permission_denied",
    );
    return;
  }

  const boardCards =
    context.boardState.getCards(
      client.boardId,
    );

  const card =
    boardCards.find(
      (item) =>
        item.id === data.cardId,
    );

  if (!card) {
    sendError(
      ws,
      "Card not found.",
      "not_found",
    );
    return;
  }

  card.columnId =
    data.toColumnId;

  card.order =
    data.order;

  card.updatedAt =
    data.updatedAt;

  card.updatedBy =
    data.updatedBy;

  context.boardState.setCards(
    client.boardId,
    boardCards,
  );

  context.rooms.broadcast(
    client.boardId,
    {
      type: "card:move",
      cardId: data.cardId,
      toColumnId:
        data.toColumnId,
      order: data.order,
      updatedAt:
        data.updatedAt,
      updatedBy:
        data.updatedBy,
    },
  );

  const ack: CardMoveAckMsg = {
    type: "card:move:ack",
    cardId: data.cardId,
    toColumnId:
      data.toColumnId,
    order: data.order,
    updatedAt:
      data.updatedAt,
    updatedBy:
      data.updatedBy,
    accepted: true,
    seq: context.rooms.nextSeq(
      client.boardId,
    ),
  };

  context.rooms.send(
    ws,
    ack,
  );
}

export function handleCardCreate(
  ws: WebSocket,
  data: CardCreateMsg,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    sendError(
      ws,
      "Viewers cannot create cards.",
      "permission_denied",
    );
    return;
  }

  const boardColumns =
    context.boardState.getColumns(
      client.boardId,
    );

  const columnId =
    data.card.columnId ||
    boardColumns[0]?.id;

  if (!columnId) {
    sendError(
      ws,
      "No destination column available.",
      "missing_column",
    );
    return;
  }

  const boardCards =
    context.boardState.getCards(
      client.boardId,
    );

  const nextCard = {
    ...data.card,
    columnId,
    updatedAt:
      new Date().toISOString(),
    updatedBy:
      data.updatedBy,
  };

  boardCards.push(nextCard);

  context.boardState.setCards(
    client.boardId,
    boardCards,
  );

  context.rooms.broadcast(
    client.boardId,
    {
      type: "card:create",
      card: nextCard,
      updatedBy:
        data.updatedBy,
    },
  );
}

export function handleCardUpdate(
  ws: WebSocket,
  data: CardUpdateMsg,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    sendError(
      ws,
      "Viewers cannot update cards.",
      "permission_denied",
    );
    return;
  }

  const boardCards =
    context.boardState.getCards(
      client.boardId,
    );

  const card =
    boardCards.find(
      (item) =>
        item.id === data.cardId,
    );

  if (!card) {
    sendError(
      ws,
      "Card not found.",
      "not_found",
    );
    return;
  }

  if (
    data.title !== undefined
  ) {
    card.title = data.title;
  }

  if (
    data.description !== undefined
  ) {
    card.description =
      data.description;
  }

  card.updatedAt =
    data.updatedAt;

  card.updatedBy =
    data.updatedBy;

  context.boardState.setCards(
    client.boardId,
    boardCards,
  );

  context.rooms.broadcast(
    client.boardId,
    {
      type: "card:update",
      cardId: data.cardId,
      title: data.title,
      description:
        data.description,
      updatedBy:
        data.updatedBy,
      updatedAt:
        data.updatedAt,
    },
  );
}

export function handleCardDelete(
  ws: WebSocket,
  data: CardDeleteMsg,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    sendError(
      ws,
      "Viewers cannot delete cards.",
      "permission_denied",
    );
    return;
  }

  const cards =
    context.boardState
      .getCards(client.boardId)
      .filter(
        (card) =>
          card.id !== data.cardId,
      );

  context.boardState.setCards(
    client.boardId,
    cards,
  );

  context.rooms.broadcast(
    client.boardId,
    {
      type: "card:delete",
      cardId: data.cardId,
      updatedBy:
        data.updatedBy,
    },
  );
}

export function handleColumnDelete(
  ws: WebSocket,
  data: ColumnDeleteMsg,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  if (client.role === "viewer") {
    sendError(
      ws,
      "Viewers cannot delete columns.",
      "permission_denied",
    );
    return;
  }

  const columns =
    context.boardState
      .getColumns(client.boardId)
      .filter(
        (column) =>
          column.id !==
          data.columnId,
      );

  const cards =
    context.boardState
      .getCards(client.boardId)
      .filter(
        (card) =>
          card.columnId !==
          data.columnId,
      );

  context.boardState.setColumns(
    client.boardId,
    columns,
  );

  context.boardState.setCards(
    client.boardId,
    cards,
  );

  context.rooms.broadcast(
    client.boardId,
    data,
  );
}

export function handleRequestSync(
  ws: WebSocket,
  data: RequestSyncMsg,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    sendError(
      ws,
      "Not joined to a board.",
      "not_joined",
    );
    return;
  }

  const state =
    context.boardState.getBoardState(
      data.boardId,
    );

  const sync: SyncStateMsg = {
    type: "sync:state",
    columns: state.columns,
    cards: state.cards,
    seq: context.rooms.nextSeq(
      data.boardId,
    ),
  };

  context.rooms.send(
    ws,
    sync,
  );
}

export function handleCursorMove(
  ws: WebSocket,
  data: CursorMoveMsg,
  context: RealtimeContext,
) {
  const client = getClient(
    ws,
    context,
  );

  if (!client) {
    return;
  }

  context.rooms.setCursor(
    client.boardId,
    client.userId,
    data.x,
    data.y,
  );

  context.rooms.broadcast(
    client.boardId,
    {
      type: "presence:update",
      users:
        context.rooms.listPresence(
          client.boardId,
        ),
    },
  );
}
