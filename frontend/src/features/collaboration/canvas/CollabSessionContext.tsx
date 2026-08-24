"use client";

/**
 * Collab Session Context
 * Shares the live whiteboard session with React Flow nodes.
 *
 * Nodes deliberately receive callbacks rather than element content through node
 * data: code editors sync on every keystroke batch, and threading content
 * through React Flow's node props would re-render the whole canvas per
 * character. Everything exposed here is referentially stable.
 */

import { createContext, useContext } from "react";
import type { OperationEnvelope, Position, Size, WhiteboardElement } from "@kanban/shared";
import type { RemoteOperationListener } from "../hooks/useWhiteboard";

export interface CollabSession {
  documentId: string;
  userId: string;
  userName: string;
  /** Bumped on every full server snapshot so editors can hard-reset. */
  snapshotEpoch: number;
  /** Reads the current element straight from the document state. */
  getElement: (elementId: string) => WhiteboardElement | undefined;
  getVersion: () => number;
  applyLocalOperation: (operation: OperationEnvelope) => void;
  subscribeToRemoteOperations: (listener: RemoteOperationListener) => () => void;
  deleteElement: (elementId: string) => void;
  /**
   * Claim local ownership of an element's position and size for the duration of
   * a drag or resize, so incoming operations do not fight the pointer.
   */
  beginGeometryEdit: (elementId: string) => void;
  /** Release local ownership claimed by `beginGeometryEdit`. */
  endGeometryEdit: (elementId: string) => void;
  /** Broadcast an element's position and size. */
  syncGeometry: (
    elementId: string,
    geometry: { position: Position; size: Size },
    options?: { throttle?: boolean }
  ) => void;
}

const CollabSessionContext = createContext<CollabSession | null>(null);

export const CollabSessionProvider = CollabSessionContext.Provider;

export function useCollabSession(): CollabSession {
  const session = useContext(CollabSessionContext);

  if (!session) {
    throw new Error("useCollabSession must be used inside a CollabSessionProvider");
  }

  return session;
}
