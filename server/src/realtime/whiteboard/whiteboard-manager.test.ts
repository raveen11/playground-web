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

test("streams code element content through text.update operations", () => {
  const manager = new WhiteboardManager();
  manager.getDocument("canvas-1", "user-1");

  manager.applyOperation("canvas-1", {
    operationId: "operation-create",
    documentId: "canvas-1",
    userId: "user-1",
    version: 0,
    timestamp: 1,
    operation: {
      type: "element.create" as const,
      element: {
        id: "code-1",
        type: "code" as const,
        position: { x: 0, y: 0 },
        size: { width: 460, height: 300 },
        language: "typescript" as const,
        title: "TypeScript",
        content: "const a = 1;",
        createdBy: "user-1",
        createdAt: 1,
        updatedAt: 1,
        updatedBy: "user-1",
      },
    },
  });

  // Each keystroke batch arrives as a full-content text.update, the same
  // operation the shape editor used for text elements.
  for (const [index, content] of ["const a = 1;\n", "const a = 1;\nconst b", "const a = 1;\nconst b = 2;"].entries()) {
    const applied = manager.applyOperation("canvas-1", {
      operationId: `operation-type-${index}`,
      documentId: "canvas-1",
      userId: "user-2",
      version: index + 1,
      timestamp: index + 2,
      operation: { type: "text.update" as const, elementId: "code-1", content },
    });
    assert.equal(applied?.serverVersion, index + 2);
  }

  const document = manager.getDocument("canvas-1", "user-1");
  assert.equal(document.version, 4);
  assert.equal(document.elements[0].content, "const a = 1;\nconst b = 2;");
  assert.equal(document.elements[0].language, "typescript");

  // A client that saw version 2 only needs the operations after it.
  assert.equal(manager.getOperationsSince("canvas-1", 2).length, 2);
  assert.equal(manager.canReplayFrom("canvas-1", 2), true);
});

test("reports when a reconnecting client falls outside the replay window", () => {
  const manager = new WhiteboardManager();
  manager.getDocument("canvas-2", "user-1");

  manager.applyOperation("canvas-2", {
    operationId: "operation-create",
    documentId: "canvas-2",
    userId: "user-1",
    version: 0,
    timestamp: 1,
    operation: {
      type: "element.create" as const,
      element: {
        id: "code-1",
        type: "code" as const,
        position: { x: 0, y: 0 },
        content: "",
        createdBy: "user-1",
        createdAt: 1,
        updatedAt: 1,
        updatedBy: "user-1",
      },
    },
  });

  // Typing emits far more operations than shape editing, so the log is capped
  // at 2000 entries and older versions can no longer be replayed.
  for (let index = 0; index < 2_100; index += 1) {
    manager.applyOperation("canvas-2", {
      operationId: `operation-type-${index}`,
      documentId: "canvas-2",
      userId: "user-1",
      version: index + 1,
      timestamp: index + 2,
      operation: { type: "text.update" as const, elementId: "code-1", content: `x${index}` },
    });
  }

  assert.equal(manager.getVersion("canvas-2"), 2_101);
  assert.equal(manager.getOperationsSince("canvas-2", 0).length, 2_000);
  assert.equal(manager.canReplayFrom("canvas-2", 0), false);
  assert.equal(manager.canReplayFrom("canvas-2", 2_050), true);
  assert.equal(manager.canReplayFrom("canvas-2", 2_101), true);
});
