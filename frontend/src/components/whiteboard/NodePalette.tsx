"use client";

/**
 * Node Palette
 * Drag source for the React Flow canvas. Each entry starts an HTML5 drag
 * carrying a language id, which the canvas turns into a code editor node at
 * the drop position.
 */

import { CODE_LANGUAGE_OPTIONS, CODE_NODE_DRAG_TYPE } from "./codeLanguages";

export function NodePalette() {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 border-r border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Code blocks</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Drag onto the canvas to add a shared editor.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {CODE_LANGUAGE_OPTIONS.map((option) => (
          <div
            key={option.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(CODE_NODE_DRAG_TYPE, option.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-slate-400 hover:bg-white active:cursor-grabbing"
          >
            <span className="grid h-7 w-9 place-items-center rounded bg-slate-900 text-[10px] font-bold text-white">
              {option.badge}
            </span>
            <span className="text-sm font-medium text-slate-700">{option.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
