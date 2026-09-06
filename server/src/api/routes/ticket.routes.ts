import { Router, type Router as ExpressRouter } from "express";
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  moveTicket,
  deleteTicket,
} from "../controllers/ticket.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  createTicketSchema,
  updateTicketSchema,
  moveTicketSchema,
} from "../schemas/board.schemas.js";

export const ticketRouter: ExpressRouter = Router();

ticketRouter.get("/board/:boardId", listTickets);
ticketRouter.post("/", validateBody(createTicketSchema), createTicket);
ticketRouter.get("/:ticketId", getTicket);
ticketRouter.patch("/:ticketId", validateBody(updateTicketSchema), updateTicket);
ticketRouter.post("/:ticketId/move", validateBody(moveTicketSchema), moveTicket);
ticketRouter.patch("/:ticketId/move", validateBody(moveTicketSchema), moveTicket);
ticketRouter.delete("/:ticketId", deleteTicket);
