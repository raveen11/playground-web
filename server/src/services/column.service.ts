import { prisma } from "../lib/prisma.js";

export class ColumnService {
  async createColumn(
    boardId: string,
    companyId: string,
    data: { name: string; position?: number },
  ) {
    const board = await prisma.board.findFirst({
      where: { id: boardId, companyId },
    });

    if (!board) {
      throw new Error("Board not found");
    }

    let position = data.position;
    if (position === undefined) {
      const highestCol = await prisma.boardColumn.findFirst({
        where: { boardId },
        orderBy: { position: "desc" },
      });
      position = highestCol ? highestCol.position + 1 : 0;
    }

    return prisma.boardColumn.create({
      data: {
        boardId,
        name: data.name.trim(),
        position,
      },
    });
  }

  async updateColumn(
    columnId: string,
    companyId: string,
    data: { name?: string; position?: number },
  ) {
    const column = await prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        board: { companyId },
      },
    });

    if (!column) {
      throw new Error("Column not found");
    }

    return prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
      },
    });
  }

  async deleteColumn(columnId: string, companyId: string) {
    const column = await prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        board: { companyId },
      },
    });

    if (!column) {
      throw new Error("Column not found");
    }

    return prisma.boardColumn.delete({
      where: { id: columnId },
    });
  }

  async reorderColumns(
    boardId: string,
    companyId: string,
    columnOrders: { id: string; position: number }[],
  ) {
    const board = await prisma.board.findFirst({
      where: { id: boardId, companyId },
    });

    if (!board) {
      throw new Error("Board not found");
    }

    return prisma.$transaction(async (tx) => {
      for (const item of columnOrders) {
        // Shift temporarily if needed or update directly
        await tx.boardColumn.update({
          where: { id: item.id },
          data: { position: item.position },
        });
      }

      return tx.boardColumn.findMany({
        where: { boardId },
        orderBy: { position: "asc" },
      });
    });
  }
}

export const columnService = new ColumnService();
