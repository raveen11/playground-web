import type { Card, Column } from "@kanban/shared";

type Board = {
  id: string;
  name: string;
  roomCode: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  name: string;
  color: string;
  text: string;
  sentAt: string;
};

export class BoardState {
  private boards = new Map<string, Board>();
  private columns = new Map<string, Column[]>();
  private cards = new Map<string, Card[]>();
  private chatMessages = new Map<string, ChatMessage[]>();

  ensureBoard(boardId: string) {
    if (this.boards.has(boardId)) {
      return;
    }

    const now = new Date().toISOString();

    this.boards.set(boardId, {
      id: boardId,
      name: `Board ${boardId}`,
      roomCode: boardId.slice(0, 8),
      createdAt: now,
    });

    const newColumns: Column[] = [
      {
        id: crypto.randomUUID(),
        boardId,
        title: "Todo",
        order: 10,
      },
      {
        id: crypto.randomUUID(),
        boardId,
        title: "In Progress",
        order: 20,
      },
      {
        id: crypto.randomUUID(),
        boardId,
        title: "Done",
        order: 30,
      },
    ];

    this.columns.set(boardId, newColumns);

    const newCards: Card[] = newColumns.map(
      (column, index) => ({
        id: crypto.randomUUID(),
        columnId: column.id,
        title: `Example card ${index + 1}`,
        description:
          "This item is shared in real time.",
        order: String(index * 10),
        updatedAt: now,
        updatedBy: "system",
      }),
    );

    this.cards.set(boardId, newCards);
  }

  getColumns(boardId: string) {
    return this.columns.get(boardId) ?? [];
  }

  getCards(boardId: string) {
    return this.cards.get(boardId) ?? [];
  }

  setColumns(boardId: string, columns: Column[]) {
    this.columns.set(boardId, columns);
  }

  setCards(boardId: string, cards: Card[]) {
    this.cards.set(boardId, cards);
  }

  getChat(boardId: string) {
    return this.chatMessages.get(boardId) ?? [];
  }

  addChatMessage(
    boardId: string,
    message: ChatMessage,
  ) {
    const messages =
      this.chatMessages.get(boardId) ?? [];

    messages.push(message);

    this.chatMessages.set(
      boardId,
      messages.slice(-100),
    );
  }

  getBoardState(boardId: string) {
    return {
      columns: this.getColumns(boardId),
      cards: this.getCards(boardId),
    };
  }
}