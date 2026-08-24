"use client";

/**
 * useCollaborativeMonaco
 * Wires a Monaco editor instance into the existing whiteboard operation
 * pipeline, so code typed in a canvas node syncs the same way shapes did.
 *
 * Reuses, unchanged:
 *  - `createTextUpdateOperation` to build a `text.update` envelope
 *  - `applyLocalOperation` for the optimistic-local-then-send round trip
 *  - the server's version assignment, dedupe and replay log
 *
 * What this hook adds on top is the editor-specific handling:
 *  - outbound keystrokes are throttled instead of sent one operation per key
 *  - inbound content is applied as a minimal edit, so a remote keystroke does
 *    not move the local caret or drop the local selection
 *  - operations the local user authored are never re-applied (no echo loop)
 *  - `handleRun` reads the editor's current content, compiles/runs it, and
 *    exposes the result (or error) via `runResult`
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import { createTextUpdateOperation } from "../operations/operationFactory";
import { diffText } from "../text/textDiff";
import { useCollabSession } from "../canvas/CollabSessionContext";
import { runJavaScript, type RunResult } from "../execution/runJavaScript";

/** Outbound throttle. Low enough to feel live, high enough to batch a burst. */
const SYNC_INTERVAL_MS = 120;

/** How long the "someone else is editing" hint stays visible. */
const REMOTE_ACTIVITY_MS = 1_500;

export type { RunResult } from "../execution/runJavaScript";

export interface UseCollaborativeMonaco {
  /** Pass to `<Editor onMount={...} />`. */
  handleEditorMount: (instance: editor.IStandaloneCodeEditor, monacoInstance?: Monaco) => void;
  /** Pass to `<Editor onChange={...} />`. */
  handleEditorChange: (value: string | undefined) => void;
  /** Sends any throttled-but-unsent content immediately. */
  flush: () => void;
  /** True while another user's edits are landing in this editor. */
  isRemoteEditing: boolean;
  /** Compiles (TS) and runs the current editor content in a sandboxed worker. */
  handleRun: () => Promise<RunResult>;
  /** True while a run is in flight. */
  isRunning: boolean;
  /** Output of the most recent run, or null before the first run / after clear. */
  runResult: RunResult | null;
  /** Empties the terminal. */
  clearRun: () => void;
}

/**
 * Strip TypeScript down to runnable JavaScript using the editor's own TS
 * compiler worker — no extra dependency, same types the editor already checks.
 */
async function transpileTypeScript(
  monaco: Monaco,
  model: editor.ITextModel
): Promise<string> {
  const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
  const client = await getWorker(model.uri);
  const output = await client.getEmitOutput(model.uri.toString());
  const emitted = output.outputFiles.find((file:any) => file.name.endsWith(".js"));
  return emitted?.text ?? model.getValue();
}

export function useCollaborativeMonaco(elementId: string): UseCollaborativeMonaco {
  const session = useCollabSession();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  /** The Monaco namespace, captured on mount so we can reach its TS compiler. */
  const monacoRef = useRef<Monaco | null>(null);
  /** Set while a remote edit is being written into the model. */
  const isApplyingRemoteRef = useRef(false);
  /** Latest local content not yet sent, or null when nothing is queued. */
  const pendingContentRef = useRef<string | null>(null);
  /** Content of the most recent operation we sent. */
  const lastSentContentRef = useRef<string>("");
  const throttleTimerRef = useRef<number | null>(null);
  const remoteActivityTimerRef = useRef<number | null>(null);

  const [isRemoteEditing, setIsRemoteEditing] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  /**
   * Send queued content as a `text.update` operation.
   */
  const flush = useCallback(() => {
    const pending = pendingContentRef.current;
    pendingContentRef.current = null;

    if (pending === null || pending === lastSentContentRef.current) return;

    const { documentId, userId, getVersion, applyLocalOperation } = sessionRef.current;

    lastSentContentRef.current = pending;

    applyLocalOperation(
      createTextUpdateOperation(documentId, userId, getVersion(), elementId, pending)
    );
  }, [elementId]);

  /**
   * Send on the leading edge, then coalesce the rest of the burst into one
   * trailing send per interval.
   */
  const scheduleFlush = useCallback(() => {
    if (throttleTimerRef.current !== null) return;

    flush();

    throttleTimerRef.current = window.setTimeout(() => {
      throttleTimerRef.current = null;
      if (pendingContentRef.current !== null) scheduleFlush();
    }, SYNC_INTERVAL_MS);
  }, [flush]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      // Remote edits go through executeEdits, which fires this handler too.
      if (isApplyingRemoteRef.current) return;
      if (value === undefined) return;

      pendingContentRef.current = value;

      scheduleFlush();
    },
    [scheduleFlush]
  );

  const handleRun = useCallback(async (): Promise<RunResult> => {
    const model = editorRef.current?.getModel();
    const language = sessionRef.current.getElement(elementId)?.language ?? "javascript";
    const runnable = language === "javascript" || language === "typescript";

    if (!model || !runnable) {
      const result: RunResult = {
        lines: [
          {
            level: "system",
            text: `Run is available for JavaScript and TypeScript only (this block is ${language}).`,
          },
        ],
        status: "ok",
        durationMs: 0,
      };
      setRunResult(result);
      return result;
    }

    setIsRunning(true);
    try {
      let code = model.getValue();

      // TypeScript can't run as-is; hand it to the editor's compiler first. If
      // that fails for any reason, run the raw source so a genuine syntax error
      // shows up in the terminal rather than being hidden here.
      if (language === "typescript" && monacoRef.current) {
        try {
          code = await transpileTypeScript(monacoRef.current, model);
        } catch {
          /* fall back to the raw source */
        }
      }

      const result = await runJavaScript(code);
      setRunResult(result);
      return result;
    } finally {
      setIsRunning(false);
    }
  }, [elementId]);

  const clearRun = useCallback(() => setRunResult(null), []);

  /**
   * Write incoming content into the model as the single edit that changed,
   * letting Monaco relocate the caret, selection and undo stack itself.
   */
  const applyRemoteContent = useCallback((nextContent: string) => {
    const instance = editorRef.current;
    const model = instance?.getModel();
    if (!instance || !model) return;

    const replacement = diffText(model.getValue(), nextContent);
    if (!replacement) return;

    const start = model.getPositionAt(replacement.start);
    const end = model.getPositionAt(replacement.end);

    isApplyingRemoteRef.current = true;
    try {
      instance.executeEdits("collab-remote", [
        {
          range: {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
          },
          text: replacement.text,
          forceMoveMarkers: true,
        },
      ]);
    } finally {
      isApplyingRemoteRef.current = false;
    }

    // The model now holds the remote edit merged over any local characters that
    // are still queued, so re-queue that merged text instead of the stale copy.
    if (pendingContentRef.current !== null) {
      pendingContentRef.current = model.getValue();
    }
  }, []);

  const markRemoteActivity = useCallback(() => {
    setIsRemoteEditing(true);

    if (remoteActivityTimerRef.current !== null) {
      window.clearTimeout(remoteActivityTimerRef.current);
    }

    remoteActivityTimerRef.current = window.setTimeout(() => {
      remoteActivityTimerRef.current = null;
      setIsRemoteEditing(false);
    }, REMOTE_ACTIVITY_MS);
  }, []);

  const handleEditorMount = useCallback(
    (instance: editor.IStandaloneCodeEditor, monacoInstance?: Monaco) => {
      editorRef.current = instance;

      if (monacoInstance) {
        monacoRef.current = monacoInstance;

        // Emit modern JS when transpiling TS, so `export`, template literals and
        // async syntax survive intact for the module worker.
        const ts = monacoInstance.languages.typescript;
        ts.typescriptDefaults.setCompilerOptions({
          ...ts.typescriptDefaults.getCompilerOptions(),
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
        });
      }

      lastSentContentRef.current = instance.getValue();

      // Losing focus is the natural point to make sure nothing is left queued.
      instance.onDidBlurEditorText(() => flush());
    },
    [flush]
  );

  /**
   * Apply content authored by other users.
   * `subscribeToRemoteOperations` already filters out our own operations.
   */
  useEffect(() => {
    return session.subscribeToRemoteOperations((envelope) => {
      const operation = envelope.operation;

      if (operation.type === "text.update" && operation.elementId === elementId) {
        applyRemoteContent(operation.content);
        markRemoteActivity();
        return;
      }

      if (
        operation.type === "element.update" &&
        operation.elementId === elementId &&
        typeof operation.changes.content === "string"
      ) {
        applyRemoteContent(operation.changes.content);
        markRemoteActivity();
      }
    });
  }, [session, elementId, applyRemoteContent, markRemoteActivity]);

  /**
   * A new snapshot means the operation stream could not be replayed, so the
   * editor is reset to the authoritative document content.
   */
  const lastSnapshotEpochRef = useRef(session.snapshotEpoch);
  useEffect(() => {
    if (session.snapshotEpoch === lastSnapshotEpochRef.current) return;
    lastSnapshotEpochRef.current = session.snapshotEpoch;

    const authoritative = session.getElement(elementId)?.content ?? "";
    pendingContentRef.current = null;
    lastSentContentRef.current = authoritative;
    applyRemoteContent(authoritative);
  }, [session, elementId, applyRemoteContent]);

  /**
   * Flush queued content on unmount, unless the element itself is gone.
   */
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      if (remoteActivityTimerRef.current !== null) {
        window.clearTimeout(remoteActivityTimerRef.current);
        remoteActivityTimerRef.current = null;
      }
      if (sessionRef.current.getElement(elementId)) flush();
    };
  }, [elementId, flush]);

  return {
    handleEditorMount,
    handleEditorChange,
    flush,
    isRemoteEditing,
    handleRun,
    isRunning,
    runResult,
    clearRun,
  };
}