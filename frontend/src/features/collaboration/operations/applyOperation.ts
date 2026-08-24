/**
 * Apply Operation
 * Pure function responsible for applying an operation to a whiteboard document
 * This is deterministic and easy to unit test
 * No WebSocket or React logic inside this function
 */

import { applyWhiteboardOperation } from "@kanban/shared";
import type { WhiteboardDocument, OperationEnvelope } from "@kanban/shared";

/**
 * Core operation application logic
 * Takes a document and operation, returns new document state
 * Throws if operation is invalid (element not found, etc.)
 */
export function applyOperation(
  document: WhiteboardDocument,
  envelope: OperationEnvelope
): WhiteboardDocument {
  return applyWhiteboardOperation(document, envelope);
}
