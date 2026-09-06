import { prisma } from "../lib/prisma.js";

export class TicketService {
  async listTickets(boardId: string, companyId?: string) {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ...(companyId ? { companyId } : {}),
      },
    });

    if (!board) {
      throw new Error("Board not found");
    }

    return prisma.ticket.findMany({
      where: { boardId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ columnId: "asc" }, { position: "asc" }],
    });
  }

  async getTicket(ticketId: string, companyId?: string) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ...(companyId ? { board: { companyId } } : {}),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        column: true,
        board: true,
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    return ticket;
  }

  async createTicket(
    companyId: string,
    data: {
      boardId: string;
      columnId: string;
      title: string;
      description?: string | null;
      priority?: string | null;
      status?: string | null;
      assigneeId?: string | null;
      position?: number;
    },
  ) {
    const board = await prisma.board.findFirst({
      where: { id: data.boardId, companyId },
    });

    if (!board) {
      throw new Error("Board not found");
    }

    const column = await prisma.boardColumn.findFirst({
      where: { id: data.columnId, boardId: data.boardId },
    });

    if (!column) {
      throw new Error("Column not found");
    }

    if (data.assigneeId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assigneeId, companyId },
      });
      if (!user) {
        throw new Error("Assignee not found in company");
      }
    }

    let position = data.position;
    if (position === undefined) {
      const highest = await prisma.ticket.findFirst({
        where: { columnId: data.columnId },
        orderBy: { position: "desc" },
      });
      position = highest ? highest.position + 1 : 0;
    }

    return prisma.ticket.create({
      data: {
        boardId: data.boardId,
        columnId: data.columnId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        priority: data.priority || "medium",
        status: data.status || column.name.toLowerCase().replace(/\s+/g, "_"),
        assigneeId: data.assigneeId || null,
        position,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateTicket(
    ticketId: string,
    companyId: string,
    data: {
      title?: string;
      description?: string | null;
      priority?: string | null;
      status?: string | null;
      assigneeId?: string | null;
    },
  ) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        board: { companyId },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (data.assigneeId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assigneeId, companyId },
      });
      if (!user) {
        throw new Error("Assignee not found in company");
      }
    }

    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.assigneeId !== undefined
          ? { assigneeId: data.assigneeId }
          : {}),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async moveTicket(
    ticketId: string,
    companyId: string,
    data: {
      toColumnId: string;
      position: number;
    },
  ) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        board: { companyId },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const toColumn = await prisma.boardColumn.findFirst({
      where: {
        id: data.toColumnId,
        boardId: ticket.boardId,
      },
    });

    if (!toColumn) {
      throw new Error("Destination column not found on board");
    }

    const fromColumnId = ticket.columnId;
    const oldPosition = ticket.position;
    const targetPosition = Math.max(0, data.position);

    return prisma.$transaction(async (tx) => {
      if (fromColumnId === data.toColumnId) {
        // Reordering within the same column
        if (targetPosition > oldPosition) {
          await tx.ticket.updateMany({
            where: {
              columnId: fromColumnId,
              position: { gt: oldPosition, lte: targetPosition },
            },
            data: { position: { decrement: 1 } },
          });
        } else if (targetPosition < oldPosition) {
          await tx.ticket.updateMany({
            where: {
              columnId: fromColumnId,
              position: { gte: targetPosition, lt: oldPosition },
            },
            data: { position: { increment: 1 } },
          });
        }
      } else {
        // Moving across different columns
        // 1. Shift tickets in old column down
        await tx.ticket.updateMany({
          where: {
            columnId: fromColumnId,
            position: { gt: oldPosition },
          },
          data: { position: { decrement: 1 } },
        });

        // 2. Shift tickets in new column up
        await tx.ticket.updateMany({
          where: {
            columnId: data.toColumnId,
            position: { gte: targetPosition },
          },
          data: { position: { increment: 1 } },
        });
      }

      // 3. Update the ticket itself
      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          columnId: data.toColumnId,
          position: targetPosition,
          status: toColumn.name.toLowerCase().replace(/\s+/g, "_"),
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  }

  async deleteTicket(ticketId: string, companyId: string) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        board: { companyId },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    return prisma.$transaction(async (tx) => {
      await tx.ticket.delete({
        where: { id: ticketId },
      });

      // Shift remaining tickets in the column
      await tx.ticket.updateMany({
        where: {
          columnId: ticket.columnId,
          position: { gt: ticket.position },
        },
        data: { position: { decrement: 1 } },
      });

      return { success: true, id: ticketId, columnId: ticket.columnId };
    });
  }
}

export const ticketService = new TicketService();
