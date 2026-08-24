/**
 * useWhiteboard Hook
 * React hook that manages whiteboard state and WebSocket collaboration
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { WhiteboardDocument, OperationEnvelope } from "@kanban/shared";
import { whiteboardReducer } from "../operations/whiteboardReducer";
import { WhiteboardWebSocketClient } from "../websocket/whiteboardWebSocketClient";

export interface UseWhiteboardConfig {
  documentId: string;
  userId: string;
  wsUrl: string;
}

export interface UseWhiteboardState {
  document: WhiteboardDocument | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  /**
   * Increments every time the server sends a full snapshot (first load and
   * after a reconnect that could not be replayed). Consumers holding their own
   * copy of an element's content use this as a signal to hard-reset it.
   */
  snapshotEpoch: number;
}

export type RemoteOperationListener = (operation: OperationEnvelope) => void;

export interface UseWhiteboardActions {
  applyLocalOperation: (operation: OperationEnvelope) => void;
  getVersion: () => number;
  isReady: () => boolean;
  /**
   * Subscribe to operations authored by *other* users. Local operations echoed
   * back by the server are filtered out, so subscribers never have to undo
   * their own edits. Returns an unsubscribe function.
   */
  subscribeToRemoteOperations: (listener: RemoteOperationListener) => () => void;
}

/**
 * Hook for managing whiteboard state with real-time collaboration
 */
export function useWhiteboard(
  config: UseWhiteboardConfig
): UseWhiteboardState & UseWhiteboardActions {
  const [state, dispatch] = useReducer(whiteboardReducer, null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotEpoch, setSnapshotEpoch] = useState(0);

  const clientRef = useRef<WhiteboardWebSocketClient | null>(null);
  const remoteListenersRef = useRef(new Set<RemoteOperationListener>());
  const hasDocumentRef = useRef(false);

  hasDocumentRef.current = state !== null;

  /**
   * Register a listener for operations coming from other users
   */
  const subscribeToRemoteOperations = useCallback(
    (listener: RemoteOperationListener) => {
      remoteListenersRef.current.add(listener);
      return () => {
        remoteListenersRef.current.delete(listener);
      };
    },
    []
  );

  /**
   * Initialize WebSocket client
   */
  useEffect(() => {
    const localUserId = config.userId;

    const client = new WhiteboardWebSocketClient({
      url: config.wsUrl,
      documentId: config.documentId,
      userId: config.userId,

      onSnapshot: (document) => {
        setIsLoading(false);
        dispatch({ type: "init", document });
        setSnapshotEpoch((epoch) => epoch + 1);
      },

      onOperation: (operation) => {
        const envelope: OperationEnvelope = {
          operationId: operation.operationId,
          documentId: operation.documentId,
          userId: operation.userId,
          version: operation.serverVersion,
          timestamp: operation.timestamp,
          operation: operation.operation,
        };

        dispatch({ type: "apply-operation", operation: envelope });

        // The server echoes our own operations back; those were already
        // applied optimistically, so only notify for genuinely remote edits.
        if (envelope.userId === localUserId) return;

        for (const listener of remoteListenersRef.current) {
          listener(envelope);
        }
      },

      onError: (errorMsg) => {
        setError(errorMsg);
      },

      onConnected: () => {
        setIsConnected(true);
        setError(null);
      },

      onDisconnected: () => {
        setIsConnected(false);
      },
    });

    clientRef.current = client;

    // Connect to server
    client
      .connect()
      .catch((err) => {
        setError(err.message ?? "Failed to connect");
        setIsLoading(false);
      });

    return () => {
      client.disconnect();
    };
  }, [config.wsUrl, config.documentId, config.userId]);

  /**
   * Apply operation locally and send to server
   *
   * Kept referentially stable: code editor nodes send operations on every
   * keystroke batch, so a callback that changed identity with the document
   * would re-subscribe and re-render them constantly.
   */
  const applyLocalOperation = useCallback(
    (operation: OperationEnvelope) => {
      if (!hasDocumentRef.current) {
        setError("Document not loaded");
        return;
      }

      // Apply to local state immediately (optimistic update)
      dispatch({ type: "apply-operation", operation });

      // Send to server
      if (clientRef.current && clientRef.current.isConnected()) {
        clientRef.current.sendOperation(operation);
      } else {
        setError("Not connected to server");
      }
    },
    []
  );

  /**
   * Get current version for creating operations
   */
  const getVersion = useCallback(() => {
    return clientRef.current?.getVersion() ?? 0;
  }, []);

  /**
   * Check if whiteboard is ready to use
   */
  const isReady = useCallback(() => {
    return state !== null && isConnected && !isLoading;
  }, [state, isConnected, isLoading]);

  return {
    document: state,
    isConnected,
    isLoading,
    error,
    snapshotEpoch,
    applyLocalOperation,
    getVersion,
    isReady,
    subscribeToRemoteOperations,
  };
}
