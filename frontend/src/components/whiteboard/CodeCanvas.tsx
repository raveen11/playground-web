"use client";

/**
 * Code Canvas
 * React Flow canvas whose nodes are collaborative Monaco editors.
 *
 * Document state is the single source of truth: nodes are projected from the
 * whiteboard document, and every canvas gesture is sent as a whiteboard
 * operation through the same pipeline the shape editor used.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CodeLanguage, Position, Size } from "@kanban/shared";
import { useWhiteboard } from "../../features/collaboration/hooks/useWhiteboard";
import {
  createCodeElement,
  createDeleteOperation,
  createElementOperation,
  createMoveOperation,
  createUpdateOperation,
} from "../../features/collaboration/operations/operationFactory";
import {
  CollabSessionProvider,
  type CollabSession,
} from "../../features/collaboration/canvas/CollabSessionContext";
import {
  CODE_NODE_DRAG_HANDLE_CLASS,
  CODE_NODE_TYPE,
  CodeEditorNode,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  type CodeEditorNodeType,
} from "./CodeEditorNode";
import { NodePalette } from "./NodePalette";
import {
  CODE_LANGUAGE_OPTIONS,
  CODE_NODE_DRAG_TYPE,
  findLanguageOption,
} from "./codeLanguages";

/** Minimum gap between geometry operations while dragging or resizing. */
const GEOMETRY_SYNC_MS = 80;

export interface CodeCanvasProps {
  documentId: string;
  userId: string;
  userName: string;
  wsUrl: string;
}

export function CodeCanvas(props: CodeCanvasProps) {
  return (
    <ReactFlowProvider>
      <CodeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CodeCanvasInner({ documentId, userId, userName, wsUrl }: CodeCanvasProps) {
  const {
    document,
    isConnected,
    isLoading,
    error,
    snapshotEpoch,
    applyLocalOperation,
    getVersion,
    isReady,
    subscribeToRemoteOperations,
  } = useWhiteboard({ documentId, userId, wsUrl });

  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<CodeEditorNodeType>([]);

  /** Latest document, readable from stable callbacks. */
  const documentRef = useRef(document);
  documentRef.current = document;

  /** Elements this client is currently dragging or resizing. */
  const interactingIdsRef = useRef(new Set<string>());
  /** Last geometry send per element, for throttling. */
  const geometrySentAtRef = useRef(new Map<string, number>());

  const getElement = useCallback(
    (elementId: string) => documentRef.current?.elements.find((element) => element.id === elementId),
    []
  );

  const deleteElement = useCallback(
    (elementId: string) => {
      interactingIdsRef.current.delete(elementId);
      geometrySentAtRef.current.delete(elementId);
      applyLocalOperation(createDeleteOperation(documentId, userId, getVersion(), elementId));
    },
    [applyLocalOperation, documentId, userId, getVersion]
  );

  const beginGeometryEdit = useCallback((elementId: string) => {
    interactingIdsRef.current.add(elementId);
  }, []);

  const endGeometryEdit = useCallback((elementId: string) => {
    interactingIdsRef.current.delete(elementId);
    geometrySentAtRef.current.delete(elementId);
  }, []);

  const syncGeometry = useCallback(
    (
      elementId: string,
      geometry: { position: Position; size: Size },
      options?: { throttle?: boolean }
    ) => {
      if (options?.throttle) {
        const now = Date.now();
        const sentAt = geometrySentAtRef.current.get(elementId) ?? 0;
        if (now - sentAt < GEOMETRY_SYNC_MS) return;
        geometrySentAtRef.current.set(elementId, now);
      }

      applyLocalOperation(
        createUpdateOperation(documentId, userId, getVersion(), elementId, {
          position: geometry.position,
          size: geometry.size,
          updatedAt: Date.now(),
          updatedBy: userId,
        })
      );
    },
    [applyLocalOperation, documentId, userId, getVersion]
  );

  const session = useMemo<CollabSession>(
    () => ({
      documentId,
      userId,
      userName,
      snapshotEpoch,
      getElement,
      getVersion,
      applyLocalOperation,
      subscribeToRemoteOperations,
      deleteElement,
      beginGeometryEdit,
      endGeometryEdit,
      syncGeometry,
    }),
    [
      documentId,
      userId,
      userName,
      snapshotEpoch,
      getElement,
      getVersion,
      applyLocalOperation,
      subscribeToRemoteOperations,
      deleteElement,
      beginGeometryEdit,
      endGeometryEdit,
      syncGeometry,
    ]
  );

  /**
   * Project code elements onto React Flow nodes.
   *
   * Nodes and their `data` objects are reused whenever nothing they render
   * changed, so a collaborator's keystroke (which only alters element content)
   * costs zero canvas re-renders.
   */
  useEffect(() => {
    if (!document) return;

    console.log('ABCD-document',document);

    setNodes((previous) => {
      const previousById = new Map(previous.map((node) => [node.id, node]));

      const next = document.elements
        .filter((element) => element.type === "code")
        .map<CodeEditorNodeType>((element) => {
          const existing = previousById.get(element.id);
          const option = findLanguageOption(element.language);

          const title = element.title ?? option.label;
          const language = option.id;
          const data =
            existing && existing.data.title === title && existing.data.language === language
              ? existing.data
              : { title, language };

          // While this client manipulates the node, React Flow owns its
          // geometry; adopting echoed values would fight the pointer.
          const isLocallyInteracting =
            interactingIdsRef.current.has(element.id) || existing?.dragging === true;

          const position = isLocallyInteracting && existing ? existing.position : element.position;
          const width = isLocallyInteracting && existing
            ? existing.width
            : (element.size?.width ?? MIN_NODE_WIDTH);
          const height = isLocallyInteracting && existing
            ? existing.height
            : (element.size?.height ?? MIN_NODE_HEIGHT);

          if (
            existing &&
            existing.data === data &&
            existing.position === position &&
            existing.width === width &&
            existing.height === height
          ) {
            return existing;
          }

          return {
            ...existing,
            id: element.id,
            type: CODE_NODE_TYPE,
            position,
            width,
            height,
            dragHandle: `.${CODE_NODE_DRAG_HANDLE_CLASS}`,
            data,
          };
        });

      const unchanged =
        next.length === previous.length && next.every((node, index) => node === previous[index]);

      return unchanged ? previous : next;
    });
  }, [document, setNodes]);

  const handleNodeDragStart: OnNodeDrag<CodeEditorNodeType> = useCallback(
    (_event, node) => beginGeometryEdit(node.id),
    [beginGeometryEdit]
  );

  const handleNodeDrag: OnNodeDrag<CodeEditorNodeType> = useCallback(
    (_event, node) => {
      const now = Date.now();
      const sentAt = geometrySentAtRef.current.get(node.id) ?? 0;
      if (now - sentAt < GEOMETRY_SYNC_MS) return;
      geometrySentAtRef.current.set(node.id, now);

      applyLocalOperation(
        createMoveOperation(documentId, userId, getVersion(), node.id, node.position)
      );
    },
    [applyLocalOperation, documentId, userId, getVersion]
  );

  const handleNodeDragStop: OnNodeDrag<CodeEditorNodeType> = useCallback(
    (_event, node) => {
      applyLocalOperation(
        createMoveOperation(documentId, userId, getVersion(), node.id, node.position)
      );
      endGeometryEdit(node.id);
    },
    [applyLocalOperation, documentId, userId, getVersion, endGeometryEdit]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  /**
   * Turn a palette drop into a shared code element at the drop point.
   */
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const dropped = event.dataTransfer.getData(CODE_NODE_DRAG_TYPE);
      const option = CODE_LANGUAGE_OPTIONS.find((candidate) => candidate.id === dropped);
      if (!option) return;

      if (!isReady()) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const element = createCodeElement(userId, {
        position,
        language: option.id satisfies CodeLanguage,
        title: option.label,
        content: option.starter,
      });

      applyLocalOperation(
        createElementOperation(documentId, userId, getVersion(), element)
      );
    },
    [applyLocalOperation, documentId, userId, getVersion, isReady, screenToFlowPosition]
  );

  const nodeTypes = useMemo(() => ({ [CODE_NODE_TYPE]: CodeEditorNode }), []);
  console.log('ABCD-nodes',nodes,nodeTypes)
  return (
    <CollabSessionProvider value={session}>
      <div className="flex h-screen flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Code Canvas</h1>
              <p className="text-xs text-slate-500">
                {documentId} · {nodes.length} {nodes.length === 1 ? "block" : "blocks"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {isConnected ? "✓ Connected" : "✗ Disconnected"}
              </span>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
                {userName}
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <NodePalette />

          <div className="relative min-w-0 flex-1" onDrop={handleDrop} onDragOver={handleDragOver}>
            <ReactFlow<CodeEditorNodeType>
              nodes={nodes}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onNodeDragStart={handleNodeDragStart}
              onNodeDrag={handleNodeDrag}
              onNodeDragStop={handleNodeDragStop}
              nodesConnectable={false}
              // Monaco owns Delete and Backspace; nodes are removed from the
              // header button instead.
              deleteKeyCode={null}
              minZoom={0.25}
              maxZoom={1.75}
              selectionOnDrag
              panOnScroll
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor="#94a3b8" className="!bg-white" />
            </ReactFlow>

            {isLoading && (
              <div className="absolute inset-0 grid place-items-center bg-slate-50/80">
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Connecting to canvas…
                </p>
              </div>
            )}

            {!isLoading && nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <p className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-5 py-3 text-sm text-slate-500">
                  Drag a code block from the left onto the canvas
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-2 text-xs text-slate-500">
          Drag a block from the palette to add an editor · drag a block header to move it · select a
          block to resize · type to sync with everyone in real time
        </footer>
      </div>
    </CollabSessionProvider>
  );
}
