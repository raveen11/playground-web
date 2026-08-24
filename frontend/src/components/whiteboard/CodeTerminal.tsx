"use client";

/**
 * CodeTerminal
 * The output drawer docked to the foot of a code node. Presentational only —
 * it renders whatever the last run produced and reports run state; the actual
 * execution lives in `runJavaScript`.
 */

import { useEffect, useRef } from "react";
import type { RunResult, TerminalLevel } from "../../features/collaboration/execution/runJavaScript";

/** Per-level text colour on the dark terminal surface. */
const LEVEL_TEXT: Record<TerminalLevel, string> = {
  log: "text-slate-300",
  info: "text-sky-300",
  warn: "text-amber-300",
  error: "text-rose-400",
  return: "text-emerald-300",
  system: "text-slate-500",
};

/** A leading glyph only where it carries meaning; plain logs stay unmarked. */
const LEVEL_GLYPH: Record<TerminalLevel, string> = {
  log: " ",
  info: "i",
  warn: "!",
  error: "✗",
  return: "→",
  system: "›",
};

type StatusChip = { text: string; className: string };

function statusChip(isRunning: boolean, result: RunResult | null): StatusChip | null {
  if (isRunning) {
    return { text: "running", className: "text-amber-300" };
  }
  if (!result) return null;

  if (result.status === "timeout") {
    return { text: "timed out", className: "text-amber-300" };
  }
  if (result.status === "error") {
    return { text: "error", className: "text-rose-400" };
  }
  return { text: `${result.durationMs} ms`, className: "text-emerald-300" };
}

interface CodeTerminalProps {
  result: RunResult | null;
  isRunning: boolean;
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export function CodeTerminal({ result, isRunning, open, onToggle, onClear }: CodeTerminalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest line in view, the way a real terminal pins to the bottom.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [result, isRunning, open]);

  const chip = statusChip(isRunning, result);
  const lines = result?.lines ?? [];

  return (
    // nodrag/nowheel/nopan: the terminal owns its own clicks and scroll so the
    // canvas underneath never pans or zooms while you read output.
    <div className="nodrag nowheel nopan shrink-0 border-t border-slate-800 bg-[#0b1120] text-slate-200">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0d1426] px-3 py-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-200 focus:outline-none focus-visible:text-slate-100"
          aria-expanded={open}
          aria-label={open ? "Collapse terminal" : "Expand terminal"}
        >
          <span
            className={`inline-block text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▸
          </span>
          Terminal
        </button>

        {chip && (
          <span className={`flex items-center gap-1.5 text-[10px] font-medium ${chip.className}`}>
            {isRunning && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
            )}
            {chip.text}
          </span>
        )}

        <button
          type="button"
          onClick={onClear}
          disabled={lines.length === 0 || isRunning}
          className="ml-auto text-[10px] font-medium text-slate-500 transition hover:text-slate-300 focus:outline-none focus-visible:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {open && (
        <div
          ref={scrollRef}
          className="h-40 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed"
        >
          {lines.length === 0 && !isRunning && (
            <p className="text-slate-600">Run your code to see its output here.</p>
          )}

          {lines.map((line, index) => (
            <div key={index} className={`flex gap-2 ${LEVEL_TEXT[line.level]}`}>
              <span className="select-none text-slate-600" aria-hidden>
                {LEVEL_GLYPH[line.level]}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{line.text}</span>
            </div>
          ))}

          {isRunning && (
            <div className="flex gap-2 text-slate-500">
              <span className="select-none" aria-hidden>
                ›
              </span>
              <span className="animate-pulse motion-reduce:animate-none">executing…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
