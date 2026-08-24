"use client";

/**
 * runJavaScript
 * Runs a snippet of JavaScript and returns everything a terminal needs to show:
 * the console output in order, thrown errors, and how the run ended.
 *
 * Why a Web Worker instead of `eval`/`new Function`/blob-`import()` on the page:
 *
 *  - Isolation. The worker has no DOM, no access to this page's globals, and no
 *    way to scribble on the collaborative canvas around it.
 *  - Survivability. A `while (true) {}` on the main thread freezes the whole
 *    tab. In a worker we just `terminate()` it when the timeout fires.
 *  - Console capture. The worker owns its own `console`, so overriding the
 *    methods captures the user's output without touching the app's console.
 *
 * The user's code runs as an ES module (via a blob `import()` inside the
 * worker), so `export`/`import`/top-level `await` all work — matching the
 * `export function …` starters the palette drops in.
 */

/** Visual channel for a terminal line; drives its colour and glyph. */
export type TerminalLevel =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "return"
  | "system";

export interface TerminalLine {
  level: TerminalLevel;
  text: string;
}

/** How a run ended — drives the status chip in the terminal header. */
export type RunStatus = "ok" | "error" | "timeout";

export interface RunResult {
  /** Console output, thrown errors and notes, in the order they occurred. */
  lines: TerminalLine[];
  status: RunStatus;
  /** Wall-clock duration of the run in milliseconds. */
  durationMs: number;
}

/** Hard ceiling on a single run. Long enough for real work, short enough that
 *  an accidental infinite loop is caught quickly. */
const RUN_TIMEOUT_MS = 4_000;

/**
 * Source of the worker. It is a static string so the worker itself never
 * changes between runs; the user's code is handed over per-run via postMessage.
 *
 * Kept dependency-free and self-contained because it is compiled from this
 * literal at runtime, not bundled.
 */
const WORKER_SOURCE = `
// Replace blob: URLs (from the dynamic import) with a readable token so stack
// traces don't leak an opaque "blob:http://…/uuid" at the user.
const clean = (text) => String(text).replace(/blob:[^\\s):]+/g, "<program>");

function replacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "bigint") return value.toString() + "n";
    if (typeof value === "function")
      return "[Function" + (value.name ? ": " + value.name : "") + "]";
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}

// Turn a single console argument into a printable string, the way a devtools
// console would: strings verbatim, everything else JSON-shaped and readable.
function format(value) {
  if (typeof value === "string") return value;
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "bigint") return value.toString() + "n";
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function")
    return "[Function" + (value.name ? ": " + value.name : "") + "]";
  if (value instanceof Error) return clean(value.stack || (value.name + ": " + value.message));
  try {
    const json = JSON.stringify(value, replacer(), 2);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

const emit = (level, args) =>
  self.postMessage({ type: "line", level, text: args.map(format).join(" ") });

for (const name of ["log", "info", "warn", "error", "debug"]) {
  const level = name === "debug" ? "log" : name;
  console[name] = (...args) => emit(level, args);
}

// Errors thrown asynchronously (setTimeout, unawaited promises) escape the
// try/catch below, so forward them too.
self.onerror = (event) =>
  self.postMessage({ type: "line", level: "error", text: clean(event.message || event) });
self.onunhandledrejection = (event) => {
  const reason = event && event.reason;
  const text = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
  self.postMessage({ type: "line", level: "error", text: clean(text) });
};

self.onmessage = async (event) => {
  const code = (event.data && event.data.code) || "";
  let url;
  try {
    url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const module = await import(url);
    const exports = Object.keys(module).filter((key) => key !== "__esModule");
    self.postMessage({ type: "done", exports });
  } catch (error) {
    const text =
      error instanceof Error ? (error.stack || (error.name + ": " + error.message)) : String(error);
    self.postMessage({ type: "error", text: clean(text) });
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
};
`;

export async function runJavaScript(code: string): Promise<RunResult> {
  const startedAt = performance.now();

  if (!code.trim()) {
    return {
      lines: [{ level: "system", text: "Nothing to run yet." }],
      status: "ok",
      durationMs: 0,
    };
  }

  const workerUrl = URL.createObjectURL(
    new Blob([WORKER_SOURCE], { type: "text/javascript" })
  );
  const worker = new Worker(workerUrl, { type: "module" });

  const lines: TerminalLine[] = [];

  return new Promise<RunResult>((resolve) => {
    let settled = false;

    const finish = (status: RunStatus) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        lines,
        status,
        durationMs: Math.round(performance.now() - startedAt),
      });
    };

    const timer = window.setTimeout(() => {
      lines.push({
        level: "error",
        text: `Execution timed out after ${RUN_TIMEOUT_MS} ms — check for an infinite loop.`,
      });
      finish("timeout");
    }, RUN_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: "line"; level: TerminalLevel; text: string }
        | { type: "error"; text: string }
        | { type: "done"; exports: string[] };

      if (message.type === "line") {
        lines.push({ level: message.level, text: message.text });
        return;
      }

      if (message.type === "error") {
        lines.push({ level: "error", text: message.text });
        finish("error");
        return;
      }

      // done
      if (message.exports.length > 0) {
        lines.push({ level: "return", text: `exports: ${message.exports.join(", ")}` });
      }
      if (lines.length === 0) {
        lines.push({ level: "system", text: "Finished with no output." });
      }
      finish(lines.some((line) => line.level === "error") ? "error" : "ok");
    };

    worker.onerror = (event) => {
      lines.push({ level: "error", text: event.message || "Worker failed to start." });
      finish("error");
    };

    worker.postMessage({ code });
  });
}
