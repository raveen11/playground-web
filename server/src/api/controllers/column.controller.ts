import type { RequestHandler } from "express";
import { columnService } from "../../services/column.service.js";
import { resolveCompanyId } from "../../lib/auth/company-scope.js";
import { broadcastToBoard } from "../../realtime/context.js";
import { paramStr } from "../../lib/params.js";

export const updateColumn: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const columnId = paramStr(req.params.columnId);
    const column = await columnService.updateColumn(columnId, companyId, req.body);

    broadcastToBoard(column.boardId, {
      type: "column:update",
      column: {
        id: column.id,
        boardId: column.boardId,
        title: column.name,
        name: column.name,
        order: column.position,
        position: column.position,
      },
    });

    res.json(column);
  } catch (error) {
    console.error("Update column failed:", error);
    res.status(500).json({ message: "Failed to update column" });
  }
};

export const deleteColumn: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const columnId = paramStr(req.params.columnId);
    const deleted = await columnService.deleteColumn(columnId, companyId);

    broadcastToBoard(deleted.boardId, {
      type: "column:delete",
      columnId,
    });

    res.json({ message: "Column deleted successfully", id: columnId });
  } catch (error) {
    console.error("Delete column failed:", error);
    res.status(500).json({ message: "Failed to delete column" });
  }
};
