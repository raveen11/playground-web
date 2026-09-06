import { Router, type Router as ExpressRouter } from "express";
import {
  listBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  createColumn,
} from "../controllers/board.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  createBoardSchema,
  updateBoardSchema,
  createColumnSchema,
} from "../schemas/board.schemas.js";

export const boardRouter: ExpressRouter = Router();

boardRouter.get("/", listBoards);
boardRouter.get("/:boardId", getBoard);
boardRouter.post("/", validateBody(createBoardSchema), createBoard);
boardRouter.patch("/:boardId", validateBody(updateBoardSchema), updateBoard);
boardRouter.delete("/:boardId", deleteBoard);
boardRouter.post(
  "/:boardId/columns",
  validateBody(createColumnSchema),
  createColumn,
);
