import { Router, type Router as ExpressRouter } from "express";
import {
  createCompanyUser,
  getCompanyUsers,
} from "../controllers/company.controller.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createCompanyUserSchema } from "../schemas/auth.schemas.js";

export const companyRouter: ExpressRouter = Router();

companyRouter.get("/users", getCompanyUsers);

companyRouter.post(
  "/users",
  requireAuth,
  requireRole("company_admin"),
  validateBody(createCompanyUserSchema),
  createCompanyUser,
);
