import { Router, type Router as ExpressRouter } from "express";
import { chatWithDocuments } from "../controllers/chat.controller.js";

export const chatRouter: ExpressRouter = Router();

chatRouter.post("/", chatWithDocuments);
