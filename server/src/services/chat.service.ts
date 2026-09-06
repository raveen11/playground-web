import { prisma } from "../lib/prisma.js";

export class ChatService {
  async listMessages(companyId: string, boardId?: string, limit = 100) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        companyId,
        ...(boardId ? { boardId } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return messages.map((m) => ({
      id: m.id,
      companyId: m.companyId,
      boardId: m.boardId,
      userId: m.senderId,
      name: m.sender.name,
      text: m.content,
      sentAt: m.createdAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
    }));
  }

  async createMessage(
    companyId: string,
    senderId: string,
    data: { content: string; boardId?: string },
  ) {
    const user = await prisma.user.findFirst({
      where: { id: senderId, companyId },
    });

    if (!user) {
      throw new Error("Sender not found in company");
    }

    if (data.boardId) {
      const board = await prisma.board.findFirst({
        where: { id: data.boardId, companyId },
      });
      if (!board) {
        throw new Error("Board not found");
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        companyId,
        boardId: data.boardId || null,
        senderId,
        content: data.content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: message.id,
      companyId: message.companyId,
      boardId: message.boardId,
      userId: message.senderId,
      name: message.sender.name,
      text: message.content,
      sentAt: message.createdAt.toISOString(),
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    };
  }

  async deleteMessage(messageId: string, companyId: string, senderId?: string) {
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        companyId,
        ...(senderId ? { senderId } : {}),
      },
    });

    if (!message) {
      throw new Error("Message not found or permission denied");
    }

    return prisma.chatMessage.delete({
      where: { id: messageId },
    });
  }
}

export const chatService = new ChatService();
