
import { config } from "../../config";

const DEFAULT_SERVER_URL = "http://localhost:3001";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Turn any origin into a browser-usable WebSocket URL: http→ws, https→wss. */
function toWebSocketUrl(origin: string): string {
  const url = new URL(origin);
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  return stripTrailingSlash(url.toString());
}

/** Origin of the backend. HTTP and WebSocket traffic share this origin. */
export const SERVER_URL = stripTrailingSlash(
  config.API_URL?.trim() || DEFAULT_SERVER_URL,
);

/** Base for REST calls, e.g. `https://…onrender.com/api`. */
export const API_BASE_URL = `${SERVER_URL}/api`;

/**
 * WebSocket URL for the backend.
 *
 * Derived from `SERVER_URL` so there is one thing to configure: an `https`
 * origin yields `wss` (required — a browser on an HTTPS page blocks plain `ws`
 * as mixed content), and `http` yields `ws` for local development.
 *
 * `config.WS_URL` overrides this when the WebSocket lives elsewhere. The scheme
 * is normalized, so an `http(s)://` override still becomes a valid `ws(s)://`
 * URL that `new WebSocket()` accepts.
 */
export function resolveWsUrl(): string {
  const override = config.WS_URL?.trim();
  if (override) return toWebSocketUrl(override);

  return toWebSocketUrl(SERVER_URL);
}

export const WS_URL = resolveWsUrl();
