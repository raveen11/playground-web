import { Router, type Router as ExpressRouter } from "express";
import {
  googleAuth,
  googleCallback,
  login,
  logout,
  me,
  refresh,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { loginSchema } from "../schemas/auth.schemas.js";

export const authRouter: ExpressRouter = Router();

authRouter.post("/login", validateBody(loginSchema), login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback) 
