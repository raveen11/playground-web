import assert from "node:assert/strict";
import test from "node:test";
import { WhiteboardManager } from "./whiteboard-manager.js";

test("applies, versions, deduplicates, and recovers whiteboard operations", () => {
  const manager = new WhiteboardManager();
  const document = manager.getDocument("whiteboard-1", "user-1");
  const operation = {
    operationId: "operation-1",
    documentId: "whiteboard-1",
    userId: "user-1",
    version: 0,
    timestamp: 1,
    operation: {
      type: "element.create" as const,
      element: {
        id: "element-1",
        type: "rectangle" as const,
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        createdBy: "user-1",
        createdAt: 1,
        updatedAt: 1,
        updatedBy: "user-1",
      },
    },
  };

  assert.equal(document.version, 0);
  const applied = manager.applyOperation("whiteboard-1", operation);
  assert.equal(applied?.serverVersion, 1);
  assert.equal(manager.getDocument("whiteboard-1", "user-1").elements.length, 1);
  assert.equal(manager.getDocument("whiteboard-1", "user-1").version, 1);

  const duplicate = manager.applyOperation("whiteboard-1", operation);
  assert.equal(duplicate?.serverVersion, 1);
  assert.equal(manager.getOperationsSince("whiteboard-1", 0).length, 1);
  assert.equal(manager.getOperationsSince("whiteboard-1", 1).length, 0);
});
