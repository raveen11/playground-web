import { prisma } from "../lib/prisma.js";

export class BoardService {
  async listBoards(companyId: string) {
    return prisma.board.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            columns: true,
            tickets: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async getBoard(boardId: string, companyId?: string) {
    return prisma.board.findFirst({
      where: {
        id: boardId,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tickets: {
              orderBy: { position: "asc" },
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createBoard(
    companyId: string,
    data: { name: string; description?: string | null },
  ) {
    return prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          companyId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
        },
      });

      const defaultColumns = ["Todo", "In Progress", "Done"];
      for (let i = 0; i < defaultColumns.length; i++) {
        await tx.boardColumn.create({
          data: {
            boardId: board.id,
            name: defaultColumns[i],
            position: i,
          },
        });
      }

      return tx.board.findUniqueOrThrow({
        where: { id: board.id },
        include: {
          columns: {
            orderBy: { position: "asc" },
          },
        },
      });
    });
  }

  async updateBoard(
    boardId: string,
    companyId: string,
    data: { name?: string; description?: string | null },
  ) {
    const existing = await prisma.board.findFirst({
      where: { id: boardId, companyId },
    });

    if (!existing) {
      throw new Error("Board not found");
    }

    return prisma.board.update({
      where: { id: boardId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
      },
      include: {
        columns: {
          orderBy: { position: "asc" },
        },
      },
    });
  }

  async deleteBoard(boardId: string, companyId: string) {
    const existing = await prisma.board.findFirst({
      where: { id: boardId, companyId },
    });

    if (!existing) {
      throw new Error("Board not found");
    }

    return prisma.board.delete({
      where: { id: boardId },
    });
  }

  async ensureDefaultBoard(companyId: string) {
    const existingBoard = await prisma.board.findFirst({
      where: { companyId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tickets: {
              orderBy: { position: "asc" },
              include: {
                assignee: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (existingBoard) {
      return existingBoard;
    }

    const created = await this.createBoard(companyId, {
      name: "Main Board",
      description: "Company workspace board",
    });

    return this.getBoard(created.id, companyId);
  }
}

export const boardService = new BoardService();
