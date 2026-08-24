/**
 * Runtime endpoints for the backend.
 *
 * The frontend (Vercel) and the server (Render) live on different origins, so
 * the server URL can never be derived from `window.location` — doing that points
 * the browser back at the Vercel domain, which serves no WebSocket. It is
 * configured explicitly instead.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so changing them on the
 * hosting provider requires a redeploy, not just a restart.
 */

const DEFAULT_SERVER_URL = "http://localhost:3001";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Origin of the backend, e.g. `https://playground-web-i74t.onrender.com`.
 * HTTP and WebSocket traffic share this origin — the server upgrades
 * WebSocket connections on the same port it serves `/api/*` from.
 */
export const SERVER_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_SERVER_URL?.trim() || DEFAULT_SERVER_URL,
);

/** Base for REST calls, e.g. `https://…onrender.com/api`. */
export const API_BASE_URL = `${SERVER_URL}/api`;

/**
 * WebSocket URL for the backend.
 *
 * Derived from `SERVER_URL` so there is one thing to configure: an `https`
 * origin yields `wss` (required — a browser on an HTTPS page blocks plain `ws`
 * as mixed content), and `http` yields `ws` for local development.
 * `NEXT_PUBLIC_WS_URL` overrides this when the WebSocket lives elsewhere.
 */
export function resolveWsUrl(): string {
  const override = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (override) return stripTrailingSlash(override);

  const url = new URL(SERVER_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return stripTrailingSlash(url.toString());
}

export const WS_URL = resolveWsUrl();
