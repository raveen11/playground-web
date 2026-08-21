import type { WhiteboardDocument, WhiteboardElement, Position, Size, ElementStyle } from "./whiteboard.types.js";

export type ElementCreateOperation = {
  type: "element.create";
  element: WhiteboardElement;
};

export type ElementUpdateOperation = {
  type: "element.update";
  elementId: string;
  changes: Partial<Omit<WhiteboardElement, "id">>;
};

export type ElementMoveOperation = {
  type: "element.move";
  elementId: string;
  position: Position;
};

export type ElementResizeOperation = {
  type: "element.resize";
  elementId: string;
  size: Size;
};

export type ElementRotateOperation = {
  type: "element.rotate";
  elementId: string;
  rotation: number;
};

export type ElementDeleteOperation = {
  type: "element.delete";
  elementId: string;
};

export type TextUpdateOperation = {
  type: "text.update";
  elementId: string;
  content: string;
};

export type StyleUpdateOperation = {
  type: "style.update";
  elementId: string;
  style: Partial<ElementStyle>;
};

export type Operation =
  | ElementCreateOperation
  | ElementUpdateOperation
  | ElementMoveOperation
  | ElementResizeOperation
  | ElementRotateOperation
  | ElementDeleteOperation
  | TextUpdateOperation
  | StyleUpdateOperation;

export type OperationEnvelope = {
  operationId: string;
  documentId: string;
  userId: string;
  version: number;
  timestamp: number;
  operation: Operation;
};

export type ServerOperation = OperationEnvelope & {
  serverVersion: number;
};

export type OperationMsg = {
  type: "operation";
  operation: OperationEnvelope;
};

export type DocumentSnapshotMsg = {
  type: "document.snapshot";
  document: WhiteboardDocument;
};

export type WhiteboardSyncMsg = {
  type: "whiteboard:sync";
  whiteboardId: string;
  operations: ServerOperation[];
};
