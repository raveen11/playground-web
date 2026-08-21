import { Router, type Router as ExpressRouter } from "express";
import {
  getDocuments,
  uploadDocument,
} from "../controllers/documents.controller.js";
import { upload } from "../middleware/upload.middleware.js";

export const documentsRouter: ExpressRouter = Router();

documentsRouter.get("/", getDocuments);
documentsRouter.post("/", upload.single("file"), uploadDocument);
