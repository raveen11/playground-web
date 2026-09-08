import { Router, type Router as ExpressRouter } from "express";
import { scrape } from "../controllers/scrape.controller.js";

export const scrapeRouter: ExpressRouter = Router();

scrapeRouter.post("/", scrape);
