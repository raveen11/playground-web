import type { RequestHandler } from "express";
import { boardService } from "../../services/board.service.js";
import { columnService } from "../../services/column.service.js";
import { resolveCompanyId } from "../../lib/auth/company-scope.js";
import { broadcastToBoard } from "../../realtime/context.js";
import { paramStr } from "../../lib/params.js";

export const listBoards: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    let boards = await boardService.listBoards(companyId);

    if (boards.length === 0) {
      await boardService.ensureDefaultBoard(companyId);
      boards = await boardService.listBoards(companyId);
    }

    res.json(boards);
  } catch (error) {
    console.error("List boards failed:", error);
    res.status(500).json({ message: "Failed to list boards" });
  }
};

export const getBoard: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const boardId = paramStr(req.params.boardId);

    let board = await boardService.getBoard(boardId, companyId);
    if (!board) {
      board = await boardService.ensureDefaultBoard(companyId);
    }

    res.json(board);
  } catch (error) {
    console.error("Get board failed:", error);
    res.status(500).json({ message: "Failed to get board" });
  }
};

export const createBoard: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const board = await boardService.createBoard(companyId, req.body);
    res.status(201).json(board);
  } catch (error) {
    console.error("Create board failed:", error);
    res.status(500).json({ message: "Failed to create board" });
  }
};

export const updateBoard: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const boardId = paramStr(req.params.boardId);
    const board = await boardService.updateBoard(boardId, companyId, req.body);
    broadcastToBoard(boardId, {
      type: "board:update",
      board,
    });
    res.json(board);
  } catch (error) {
    console.error("Update board failed:", error);
    res.status(500).json({ message: "Failed to update board" });
  }
};

export const deleteBoard: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const boardId = paramStr(req.params.boardId);
    await boardService.deleteBoard(boardId, companyId);
    broadcastToBoard(boardId, {
      type: "board:delete",
      boardId,
    });
    res.json({ message: "Board deleted successfully" });
  } catch (error) {
    console.error("Delete board failed:", error);
    res.status(500).json({ message: "Failed to delete board" });
  }
};

export const createColumn: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const boardId = paramStr(req.params.boardId);
    const column = await columnService.createColumn(boardId, companyId, req.body);

    broadcastToBoard(boardId, {
      type: "column:create",
      column: {
        id: column.id,
        boardId: column.boardId,
        title: column.name,
        name: column.name,
        order: column.position,
        position: column.position,
      },
    });

    res.status(201).json(column);
  } catch (error) {
    console.error("Create column failed:", error);
    res.status(500).json({ message: "Failed to create column" });
  }
};
