import { Router, type Router as ExpressRouter } from "express";
import {
  updateColumn,
  deleteColumn,
} from "../controllers/column.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { updateColumnSchema } from "../schemas/board.schemas.js";

export const columnRouter: ExpressRouter = Router();

columnRouter.patch("/:columnId", validateBody(updateColumnSchema), updateColumn);
columnRouter.delete("/:columnId", deleteColumn);
