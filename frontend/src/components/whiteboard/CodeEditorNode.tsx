"use client";

/**
 * Code Editor Node
 * React Flow node hosting a Monaco editor whose content is shared in real time.
 *
 * Content is intentionally *not* passed in through node data. It is read once
 * on mount and kept live by `useCollaborativeMonaco`, so a remote keystroke
 * never re-renders the canvas or resets the local caret.
 */

import { memo, useMemo, useRef } from "react";
import Editor from "@monaco-editor/react";
import { NodeResizer, type NodeProps, type Node } from "@xyflow/react";
import type { CodeLanguage } from "@kanban/shared";
import { useCollabSession } from "../../features/collaboration/canvas/CollabSessionContext";
import { useCollaborativeMonaco } from "../../features/collaboration/hooks/useCollaborativeMonaco";
import { createUpdateOperation } from "../../features/collaboration/operations/operationFactory";
import { CODE_LANGUAGE_OPTIONS } from "./codeLanguages";

export const CODE_NODE_TYPE = "codeEditor";

/** Class React Flow uses as the node's drag handle, so Monaco keeps the mouse. */
export const CODE_NODE_DRAG_HANDLE_CLASS = "code-node-drag-handle";

export const MIN_NODE_WIDTH = 320;
export const MIN_NODE_HEIGHT = 200;

export type CodeNodeData = {
  title: string;
  language: CodeLanguage;
};

export type CodeEditorNodeType = Node<CodeNodeData, typeof CODE_NODE_TYPE>;

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbersMinChars: 3,
  scrollBeyondLastLine: false,
  // The node is resizable, so Monaco has to track its container.
  automaticLayout: true,
  padding: { top: 10, bottom: 10 },
  tabSize: 2,
  renderLineHighlight: "none",
  smoothScrolling: true,
} as const;

function CodeEditorNodeComponent({ id, data, selected }: NodeProps<CodeEditorNodeType>) {
  const session = useCollabSession();
  const { handleEditorMount, handleEditorChange, flush, isRemoteEditing } =
    useCollaborativeMonaco(id);

  // Read once: later content arrives through the operation stream.
  const initialContentRef = useRef<string | null>(null);
  if (initialContentRef.current === null) {
    initialContentRef.current = session.getElement(id)?.content ?? "";
  }

  const editorPath = useMemo(() => `code-node-${id}`, [id]);

  const handleLanguageChange = (language: CodeLanguage) => {
    // Send any queued keystrokes first so they are not ordered after the
    // language switch.
    flush();

    session.applyLocalOperation(
      createUpdateOperation(session.documentId, session.userId, session.getVersion(), id, {
        language,
        updatedAt: Date.now(),
        updatedBy: session.userId,
      })
    );
  };

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white shadow-lg transition ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300"
      }`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_WIDTH}
        minHeight={MIN_NODE_HEIGHT}
        lineClassName="border-blue-400"
        handleClassName="h-2.5 w-2.5 rounded-sm border border-white bg-blue-500"
        onResizeStart={() => session.beginGeometryEdit(id)}
        onResize={(_event, params) =>
          session.syncGeometry(
            id,
            {
              position: { x: params.x, y: params.y },
              size: { width: params.width, height: params.height },
            },
            { throttle: true }
          )
        }
        onResizeEnd={(_event, params) => {
          session.syncGeometry(id, {
            position: { x: params.x, y: params.y },
            size: { width: params.width, height: params.height },
          });
          session.endGeometryEdit(id);
        }}
      />

      {/* Header doubles as the drag handle */}
      <div
        className={`${CODE_NODE_DRAG_HANDLE_CLASS} flex cursor-grab items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 active:cursor-grabbing`}
      >
        <span className="truncate text-xs font-semibold text-slate-700">{data.title}</span>

        {isRemoteEditing && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            remote edit
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <select
            value={data.language}
            onChange={(event) => handleLanguageChange(event.target.value as CodeLanguage)}
            className="nodrag rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 focus:border-slate-500 focus:outline-none"
            aria-label="Editor language"
          >
            {CODE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => session.deleteElement(id)}
            className="nodrag grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete code block"
            title="Delete code block"
          >
            ×
          </button>
        </div>
      </div>

      {/*
        nodrag  - Monaco owns click and drag inside the editor
        nowheel - scrolling code must not zoom the canvas
        nopan   - selecting text must not pan the canvas
      */}
      <div className="nodrag nowheel nopan min-h-0 flex-1">
        <Editor
          path={editorPath}
          defaultValue={initialContentRef.current}
          language={data.language}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={EDITOR_OPTIONS}
          loading={<div className="p-3 text-xs text-slate-400">Loading editor…</div>}
          theme="vs"
        />
      </div>
    </div>
  );
}

export const CodeEditorNode = memo(CodeEditorNodeComponent);
