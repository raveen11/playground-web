import { Router, type Router as ExpressRouter } from "express";
import { createCompany } from "../controllers/admin.controller.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createCompanySchema } from "../schemas/auth.schemas.js";

export const adminRouter: ExpressRouter = Router();

adminRouter.post(
  "/companies",
  requireAuth,
  requireRole("super_admin"),
  validateBody(createCompanySchema),
  createCompany,
);
