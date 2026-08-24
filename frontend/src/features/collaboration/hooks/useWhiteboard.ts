/**
 * useWhiteboard Hook
 * React hook that manages whiteboard state and WebSocket collaboration
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type {
  WhiteboardDocument,
  OperationEnvelope,
  ServerOperation,
} from "@kanban/shared";
import {
  whiteboardReducer,
  createEmptyDocument,
} from "../operations/whiteboardReducer";
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
}

export interface UseWhiteboardActions {
  applyLocalOperation: (operation: OperationEnvelope) => void;
  getVersion: () => number;
  isReady: () => boolean;
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

  const clientRef = useRef<WhiteboardWebSocketClient | null>(null);

  /**
   * Initialize WebSocket client
   */
  useEffect(() => {
    const client = new WhiteboardWebSocketClient({
      url: config.wsUrl,
      documentId: config.documentId,
      userId: config.userId,

      onSnapshot: (document) => {
        setIsLoading(false);
        dispatch({ type: "init", document });
      },

      onOperation: (operation) => {
        dispatch({
          type: "apply-operation",
          operation: {
            operationId: operation.operationId,
            documentId: operation.documentId,
            userId: operation.userId,
            version: operation.serverVersion,
            timestamp: operation.timestamp,
            operation: operation.operation,
          },
        });
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
   */
  const applyLocalOperation = useCallback(
    (operation: OperationEnvelope) => {
      if (!state) {
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
    [state]
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
    applyLocalOperation,
    getVersion,
    isReady,
  };
}
