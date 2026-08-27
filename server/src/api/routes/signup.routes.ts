import { Router, type Router as ExpressRouter } from "express";
import { signup } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { signupSchema } from "../schemas/auth.schemas.js";

export const signupRouter: ExpressRouter = Router();

signupRouter.post("/", validateBody(signupSchema), signup);
