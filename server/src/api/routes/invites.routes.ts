import { Router, type Router as ExpressRouter } from "express";
import { acceptInvite } from "../controllers/invites.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { acceptInviteSchema } from "../schemas/auth.schemas.js";

export const invitesRouter: ExpressRouter = Router();

invitesRouter.post(
  "/:token/accept",
  validateBody(acceptInviteSchema),
  acceptInvite,
);
