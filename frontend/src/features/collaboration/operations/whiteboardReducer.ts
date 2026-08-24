/**
 * Whiteboard State Reducer
 * Manages whiteboard document state with operation application
 */

import type {
  WhiteboardDocument,
  OperationEnvelope,
} from "@kanban/shared";
import { applyOperation } from "./applyOperation";

export type WhiteboardAction =
  | { type: "init"; document: WhiteboardDocument }
  | { type: "apply-operation"; operation: OperationEnvelope }
  | { type: "reset" };

export function whiteboardReducer(
  state: WhiteboardDocument | null,
  action: WhiteboardAction
): WhiteboardDocument | null {
  switch (action.type) {
    case "init":
      return action.document;

    case "apply-operation":
      if (!state) {
        // Document not loaded yet
        return null;
      }

      try {
        return applyOperation(state, action.operation);
      } catch (error) {
        console.error("Failed to apply operation:", error);
        // In production, might want to request full sync here
        return state;
      }

    case "reset":
      return null;

    default:
      const _exhaustiveCheck: never = action;
      return _exhaustiveCheck;
  }
}

/**
 * Create initial whiteboard document
 */
export function createEmptyDocument(
  documentId: string,
  userId: string
): WhiteboardDocument {
  return {
    id: documentId,
    version: 0,
    elements: [],
    createdAt: Date.now(),
    createdBy: userId,
  };
}
