import {
  type ClientOutgoingMessage,
  type ConnectionEventHandler,
  type ConnectionEventMap,
  type ConnectionEventType,
  type ServerEventHandler,
  type ServerEventMap,
  type ServerEventType,
  isTypedServerMessage,
} from "./types";

type AnyHandler = (payload: unknown) => void;

const HEARTBEAT_INTERVAL_MS = 10_000;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8_000;

export type WebSocketClientOptions = {
  /** Auto-reconnect after unexpected close. Default: true */
  reconnect?: boolean;
  /** Heartbeat interval in ms. Set 0 to disable. Default: 10000 */
  heartbeatIntervalMs?: number;
};

/**
 * Typed WebSocket client with a professional event-bus API.
 *
 * Usage:
 *   client.on("sync:state", (msg) => ...)
 *   client.onConnection("open", () => ...)
 *   client.send({ type: "room:join", ... })
 */
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private readonly serverHandlers = new Map<
    ServerEventType,
    Set<AnyHandler>
  >();
  private readonly connectionHandlers = new Map<
    ConnectionEventType,
    Set<AnyHandler>
  >();

  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect: boolean;
  private heartbeatIntervalMs: number;
  private connectPromise: Promise<void> | null = null;
  private heartbeatUserId: string | null = null;

  constructor(
    private readonly url: string,
    options: WebSocketClientOptions = {},
  ) {
    this.shouldReconnect = options.reconnect ?? true;
    this.heartbeatIntervalMs =
      options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;
  }

  connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      const clearConnectPromise = () => {
        this.connectPromise = null;
      };

      socket.onopen = () => {
        console.log("[WS] Connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emitConnection("open", undefined);
        clearConnectPromise();
        resolve();
      };

      socket.onerror = (error) => {
        console.error("[WS] Error:", error);
        this.emitConnection("error", error);
        // Only reject if still connecting; later errors are connection events.
        if (this.connectPromise) {
          clearConnectPromise();
          reject(error);
        }
      };

      socket.onclose = (event) => {
        console.log("[WS] Disconnected");
        this.stopHeartbeat();
        this.socket = null;
        this.emitConnection("close", {
          code: event.code,
          reason: event.reason,
        });
        clearConnectPromise();
        this.scheduleReconnect();
      };

      socket.onmessage = (event) => {
        this.handleRawMessage(event.data);
      };
    });

    return this.connectPromise;
  }

  /**
   * Subscribe to a typed server event. Returns an unsubscribe function.
   */
  on<T extends ServerEventType>(
    type: T,
    handler: ServerEventHandler<T>,
  ): () => void {
    const set = this.serverHandlers.get(type) ?? new Set<AnyHandler>();
    set.add(handler as AnyHandler);
    this.serverHandlers.set(type, set);

    return () => {
      set.delete(handler as AnyHandler);
      if (set.size === 0) {
        this.serverHandlers.delete(type);
      }
    };
  }

  /**
   * Subscribe to connection lifecycle events (open / close / error / reconnecting).
   */
  onConnection<T extends ConnectionEventType>(
    type: T,
    handler: ConnectionEventHandler<T>,
  ): () => void {
    const set = this.connectionHandlers.get(type) ?? new Set<AnyHandler>();
    set.add(handler as AnyHandler);
    this.connectionHandlers.set(type, set);

    return () => {
      set.delete(handler as AnyHandler);
      if (set.size === 0) {
        this.connectionHandlers.delete(type);
      }
    };
  }

  /**
   * Send a typed outbound message. No-ops (with a warning) if not connected.
   */
  send(message: ClientOutgoingMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[WS] Cannot send. Not connected.", message.type);
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  /**
   * Join a board room and start heartbeats for the given user.
   */
  joinRoom(params: {
    boardId: string;
    userId: string;
    name: string;
    role?: "viewer" | "editor" | "admin";
  }): boolean {
    this.heartbeatUserId = params.userId;
    this.startHeartbeat();

    return this.send({
      type: "room:join",
      boardId: params.boardId,
      userId: params.userId,
      name: params.name,
      role: params.role,
    });
  }

  close() {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.connectPromise = null;
  }

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private handleRawMessage(raw: unknown) {
    if (typeof raw !== "string") {
      // Server may occasionally send a plain text ack (e.g. connection:WS).
      if (typeof raw === "object" && raw !== null && "data" in raw) {
        return;
      }
      console.log("[WS] Non-JSON message:", raw);
      return;
    }

    // Plain-text acknowledgements (not JSON)
    if (!raw.startsWith("{") && !raw.startsWith("[")) {
      console.log("[WS] Text message:", raw);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[WS] Failed to parse message:", raw);
      return;
    }

    if (!isTypedServerMessage(parsed)) {
      console.warn("[WS] Message missing type:", parsed);
      return;
    }

    const type = parsed.type as ServerEventType;
    const handlers = this.serverHandlers.get(type);

    if (!handlers || handlers.size === 0) {
      console.debug("[WS] Unhandled event:", type, parsed);
      return;
    }

    for (const handler of handlers) {
      try {
        handler(parsed as ServerEventMap[typeof type]);
      } catch (error) {
        console.error(`[WS] Handler error for "${type}":`, error);
      }
    }
  }

  private emitConnection<T extends ConnectionEventType>(
    type: T,
    payload: ConnectionEventMap[T],
  ) {
    const handlers = this.connectionHandlers.get(type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[WS] Connection handler error for "${type}":`, error);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    if (this.heartbeatIntervalMs <= 0) return;

    this.heartbeatTimer = window.setInterval(() => {
      if (!this.isConnected || !this.heartbeatUserId) return;
      this.send({
        type: "heartbeat",
        userId: this.heartbeatUserId,
      });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer === null) return;
    window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer !== null) return;

    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempts += 1;
    this.emitConnection("reconnecting", { attempt: this.reconnectAttempts });

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => undefined);
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer === null) return;
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
