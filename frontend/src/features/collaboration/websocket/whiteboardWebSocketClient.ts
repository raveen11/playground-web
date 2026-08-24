/**
 * Whiteboard WebSocket Client
 * Handles connection, operation sending/receiving, and reconnection
 */

import type {
  WhiteboardDocument,
  OperationEnvelope,
  ServerOperation,
  OperationMsg,
  DocumentSnapshotMsg,
} from "@kanban/shared";

export interface WhiteboardWebSocketClientConfig {
  url: string;
  documentId: string;
  userId: string;
  onSnapshot: (document: WhiteboardDocument) => void;
  onOperation: (operation: ServerOperation) => void;
  onError: (error: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

/**
 * WebSocket client for whiteboard operations
 * Separates network concerns from application logic
 */
export class WhiteboardWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WhiteboardWebSocketClientConfig;
  private isConnecting = false;
  private lastKnownVersion = 0;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = true;

  constructor(config: WhiteboardWebSocketClientConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error("Connection in progress"));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.addEventListener("open", () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log("WebSocket connected");

          // Join document
          this.joinDocument();

          // Start heartbeat
          this.startHeartbeat();

          this.config.onConnected();
          resolve();
        });

        this.ws.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error("Failed to parse message:", error);
          }
        });

        this.ws.addEventListener("error", (event) => {
          console.error("WebSocket error:", event);
          this.config.onError("WebSocket connection error");
          reject(new Error("WebSocket connection failed"));
        });

        this.ws.addEventListener("close", () => {
          console.log("WebSocket disconnected");
          this.isConnecting = false;
          this.stopHeartbeat();
          this.config.onDisconnected();
          this.scheduleReconnect();
        });
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send operation to server
   */
  sendOperation(operation: OperationEnvelope): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.config.onError("Not connected to server");
      return;
    }

    const message = {
      type: "whiteboard:operation",
      operation,
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Failed to send operation:", error);
      this.config.onError("Failed to send operation");
    }
  }

  /**
   * Get current version for creating new operations
   */
  getVersion(): number {
    return this.lastKnownVersion;
  }

  /**
   * Handle incoming messages from server
   */
  private handleMessage(data: unknown): void {
    const msg = data as Record<string, unknown>;

    switch (msg.type) {
      case "document.snapshot":
        this.handleSnapshot(msg as DocumentSnapshotMsg);
        break;

      case "operation":
        this.handleOperation(msg as OperationMsg);
        break;

      case "whiteboard:sync":
        this.handleSync(msg as { operations?: ServerOperation[] });
        break;

      case "error":
        this.handleError(msg as { message?: string });
        break;

      default:
        console.warn("Unknown message type:", msg.type);
    }
  }

  /**
   * Handle document snapshot
   */
  private handleSnapshot(msg: DocumentSnapshotMsg): void {
    console.log("Received document snapshot:", msg.document);
    this.lastKnownVersion = msg.document.version;
    this.config.onSnapshot(msg.document);
  }

  /**
   * Handle operation message
   */
  private handleOperation(msg: OperationMsg): void {
    console.log("Received operation:", msg.operation);
    // Cast to ServerOperation to access serverVersion
    const serverOp = msg.operation as ServerOperation;
    this.lastKnownVersion = serverOp.serverVersion;
    this.config.onOperation(serverOp);
  }

  private handleSync(msg: { operations?: ServerOperation[] }): void {
    for (const operation of msg.operations ?? []) {
      this.lastKnownVersion = operation.serverVersion;
      this.config.onOperation(operation);
    }
  }

  /**
   * Handle error message
   */
  private handleError(msg: { message?: string }): void {
    const errorMsg = msg.message ?? "Unknown error";
    console.error("Server error:", errorMsg);
    this.config.onError(errorMsg);
  }

  /**
   * Join and recover the whiteboard from the last server version.
   */
  private joinDocument(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const joinMsg = {
      type: "whiteboard:join",
      whiteboardId: this.config.documentId,
      userId: this.config.userId,
      lastVersion: this.lastKnownVersion,
    };

    this.ws.send(JSON.stringify(joinMsg));
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer !== null) return;
    const delay = Math.min(500 * 2 ** this.reconnectAttempts, 8_000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => undefined);
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
