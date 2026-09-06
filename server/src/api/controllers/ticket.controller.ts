import type { RequestHandler } from "express";
import { ticketService } from "../../services/ticket.service.js";
import { resolveCompanyId } from "../../lib/auth/company-scope.js";
import { broadcastToBoard } from "../../realtime/context.js";
import { paramStr } from "../../lib/params.js";

export const listTickets: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const boardId = paramStr(req.params.boardId);
    const tickets = await ticketService.listTickets(boardId, companyId);
    res.json(tickets);
  } catch (error) {
    console.error("List tickets failed:", error);
    res.status(500).json({ message: "Failed to list tickets" });
  }
};

export const getTicket: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const ticketId = paramStr(req.params.ticketId);
    const ticket = await ticketService.getTicket(ticketId, companyId);
    res.json(ticket);
  } catch (error) {
    console.error("Get ticket failed:", error);
    res.status(500).json({ message: "Failed to get ticket" });
  }
};

export const createTicket: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const ticket = await ticketService.createTicket(companyId, req.body);

    broadcastToBoard(ticket.boardId, {
      type: "card:create",
      card: {
        id: ticket.id,
        boardId: ticket.boardId,
        columnId: ticket.columnId,
        title: ticket.title,
        description: ticket.description,
        order: String(ticket.position),
        position: ticket.position,
        priority: ticket.priority,
        status: ticket.status,
        assigneeId: ticket.assigneeId,
        assignee: ticket.assignee,
        updatedAt: ticket.updatedAt.toISOString(),
        updatedBy: req.user?.userId || "user",
      },
      updatedBy: req.user?.userId || "user",
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Create ticket failed:", error);
    res.status(500).json({ message: "Failed to create ticket" });
  }
};

export const updateTicket: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const ticketId = paramStr(req.params.ticketId);
    const ticket = await ticketService.updateTicket(ticketId, companyId, req.body);

    broadcastToBoard(ticket.boardId, {
      type: "card:update",
      cardId: ticket.id,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      assigneeId: ticket.assigneeId,
      assignee: ticket.assignee,
      updatedAt: ticket.updatedAt.toISOString(),
      updatedBy: req.user?.userId || "user",
    });

    res.json(ticket);
  } catch (error) {
    console.error("Update ticket failed:", error);
    res.status(500).json({ message: "Failed to update ticket" });
  }
};

export const moveTicket: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const ticketId = paramStr(req.params.ticketId);
    const { toColumnId, position } = req.body;

    const ticket = await ticketService.moveTicket(ticketId, companyId, {
      toColumnId,
      position: Number(position),
    });

    broadcastToBoard(ticket.boardId, {
      type: "card:move",
      cardId: ticket.id,
      toColumnId: ticket.columnId,
      order: String(ticket.position),
      position: ticket.position,
      priority: ticket.priority,
      status: ticket.status,
      updatedAt: ticket.updatedAt.toISOString(),
      updatedBy: req.user?.userId || "user",
    });

    res.json(ticket);
  } catch (error) {
    console.error("Move ticket failed:", error);
    res.status(500).json({ message: "Failed to move ticket" });
  }
};

export const deleteTicket: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const ticketId = paramStr(req.params.ticketId);
    const ticket = await ticketService.getTicket(ticketId, companyId);
    await ticketService.deleteTicket(ticketId, companyId);

    broadcastToBoard(ticket.boardId, {
      type: "card:delete",
      cardId: ticketId,
      updatedBy: req.user?.userId || "user",
    });

    res.json({ message: "Ticket deleted successfully", id: ticketId });
  } catch (error) {
    console.error("Delete ticket failed:", error);
    res.status(500).json({ message: "Failed to delete ticket" });
  }
};
