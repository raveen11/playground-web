/**
 * Operation Factory
 * Helper functions to create operations with unique IDs and timestamps
 */

import type {
  Operation,
  OperationEnvelope,
  WhiteboardElement,
  CodeLanguage,
  Position,
  Size,
  ElementStyle,
} from "@kanban/shared";

/**
 * Generate a unique operation ID
 * In production, could use Ulid or similar for better sortability
 */
export function generateOperationId(): string {
  return `op-${crypto.randomUUID()}`;
}

/**
 * Create operation envelope with metadata
 */
export function createOperationEnvelope(
  documentId: string,
  userId: string,
  version: number,
  operation: Operation
): OperationEnvelope {
  return {
    operationId: generateOperationId(),
    documentId,
    userId,
    version,
    timestamp: Date.now(),
    operation,
  };
}

/**
 * Factory methods for each operation type
 */

export function createElementOperation(
  documentId: string,
  userId: string,
  version: number,
  element: WhiteboardElement
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "element.create",
    element,
  });
}

export function createMoveOperation(
  documentId: string,
  userId: string,
  version: number,
  elementId: string,
  position: Position
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "element.move",
    elementId,
    position,
  });
}

export function createResizeOperation(
  documentId: string,
  userId: string,
  version: number,
  elementId: string,
  size: Size
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "element.resize",
    elementId,
    size,
  });
}

export function createRotateOperation(
  documentId: string,
  userId: string,
  version: number,
  elementId: string,
  rotation: number
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "element.rotate",
    elementId,
    rotation,
  });
}

export function createDeleteOperation(
  documentId: string,
  userId: string,
  version: number,
  elementId: string
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "element.delete",
    elementId,
  });
}

export function createTextUpdateOperation(
  documentId: string,
  userId: string,
  version: number,
  elementId: string,
  content: string
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "text.update",
    elementId,
    content,
  });
}

export function createStyleUpdateOperation(
  documentId: string,
  userId: string,
  version: number,
  elementId: string,
  style: Partial<ElementStyle>
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "style.update",
    elementId,
    style,
  });
}

export function createUpdateOperation(
  documentId: string,
  userId: string,
  version: number,
  elementId: string,
  changes: Partial<Omit<WhiteboardElement, "id">>
): OperationEnvelope {
  return createOperationEnvelope(documentId, userId, version, {
    type: "element.update",
    elementId,
    changes,
  });
}

/**
 * Build a code editor element.
 * Kept next to the other factories so canvas code never hand-rolls elements.
 */
export function createCodeElement(
  userId: string,
  options: {
    position: Position;
    language: CodeLanguage;
    title: string;
    content: string;
    size?: Size;
  }
): WhiteboardElement {
  const now = Date.now();

  return {
    id: `code-${crypto.randomUUID()}`,
    type: "code",
    position: options.position,
    size: options.size ?? { width: 460, height: 300 },
    language: options.language,
    title: options.title,
    content: options.content,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    updatedBy: userId,
  };
}
