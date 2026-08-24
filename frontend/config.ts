/**
 * Backend endpoints, selected by environment.
 *
 * This module is imported into client components, so every value must be
 * reachable from the browser. In Next.js that means only `NEXT_PUBLIC_*`
 * variables are visible here — they are inlined into the client bundle at build
 * time. A plain `process.env.FOO` (no prefix) is `undefined` in the browser,
 * which is why the earlier `API_URL` / `API_URL_DEV` reads silently fell back to
 * the wrong host.
 *
 * `NODE_ENV` is set by Next.js itself, not by us:
 *   • `next dev`               → "development"  (pnpm dev)
 *   • `next build` / `next start` → "production" (deployed)
 *
 * Leave `WS_URL` empty to derive the WebSocket URL from `API_URL`
 * (http→ws, https→wss). Only set `NEXT_PUBLIC_WS_URL` when the WebSocket lives
 * on a different origin than the REST API.
 */
const configProd = {
  API_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://playground-web-i74t.onrender.com",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || "",
};

const configDev = {
  // The local server serves HTTP + WebSocket on the same port (default 3001).
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || "",
};

export const config =
  process.env.NODE_ENV === "production" ? configProd : configDev;
