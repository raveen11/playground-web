"use client";

/**
 * Whiteboard Canvas Component
 * Main UI for collaborative whiteboard with HTML5 Canvas rendering
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  WhiteboardDocument,
  WhiteboardElement,
  Position,
  Size,
} from "@kanban/shared";
import { useWhiteboard } from "../../features/collaboration/hooks/useWhiteboard";
import {
  createMoveOperation,
  createResizeOperation,
  createElementOperation,
  createDeleteOperation,
} from "../../features/collaboration/operations/operationFactory";
import { TextEditorToolbar } from "./TextEditorToolbar";

interface WhiteboardProps {
  documentId: string;
  userId: string;
  wsUrl: string;
  userName: string;
}

interface UIState {
  selectedElementId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  dragStart: Position | null;
  resizeStart: { position: Position; size: Size } | null;
  isCreatingRect: boolean;
  createStart: Position | null;
  isEditingText: boolean;
  editingElementId: string | null;
  textContent: string;
  textFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    bullet: boolean;
    fontSize: number;
  };
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1200;

export function Whiteboard({
  documentId,
  userId,
  wsUrl,
  userName,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uiState, setUIState] = useState<UIState>({
    selectedElementId: null,
    isDragging: false,
    isResizing: false,
    dragStart: null,
    resizeStart: null,
    isCreatingRect: false,
    createStart: null,
    isEditingText: false,
    editingElementId: null,
    textContent: "",
    textFormatting: {
      bold: false,
      italic: false,
      underline: false,
      bullet: false,
      fontSize: 16,
    },
  });

  // Use whiteboard hook for state management
  const {
    document,
    isConnected,
    isLoading,
    error,
    applyLocalOperation,
    getVersion,
    isReady,
  } = useWhiteboard({
    documentId,
    userId,
    wsUrl,
  });

  /**
   * Render canvas
   */
  useEffect(() => {
    if (!canvasRef.current || !document) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw elements
    document.elements.forEach((element) => {
      const isSelected = element.id === uiState.selectedElementId;
      drawElement(ctx, element, isSelected);
    });

    // Draw selection handles if element selected
    if (uiState.selectedElementId) {
      const selected = document.elements.find(
        (e) => e.id === uiState.selectedElementId
      );
      if (selected) {
        drawSelectionHandles(ctx, selected);
      }
    }
  }, [document, uiState.selectedElementId]);

  /**
   * Find element at position
   */
  const getElementAtPosition = useCallback(
    (pos: Position): WhiteboardElement | null => {
      if (!document) return null;

      // Check elements in reverse order (last drawn is on top)
      for (let i = document.elements.length - 1; i >= 0; i--) {
        const elem = document.elements[i];
        if (isPointInElement(pos, elem)) {
          return elem;
        }
      }

      return null;
    },
    [document]
  );

  /**
   * Canvas mouse down
   */
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isReady() || !document) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const pos: Position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Check if clicking on selection handle
      if (uiState.selectedElementId) {
        const selected = document.elements.find(
          (e) => e.id === uiState.selectedElementId
        );
        if (selected && isPointInResizeHandle(pos, selected)) {
          setUIState((prev) => ({
            ...prev,
            isResizing: true,
            resizeStart: { position: selected.position, size: selected.size! },
            dragStart: pos,
          }));
          return;
        }
      }

      const element = getElementAtPosition(pos);

      if (element) {
        // Dragging existing element
        setUIState((prev) => ({
          ...prev,
          selectedElementId: element.id,
          isDragging: true,
          dragStart: pos,
        }));
      } else {
        // Start creating rectangle
        setUIState((prev) => ({
          ...prev,
          selectedElementId: null,
          isCreatingRect: true,
          createStart: pos,
        }));
      }
    },
    [document, uiState.selectedElementId, getElementAtPosition, isReady]
  );

  /**
   * Canvas mouse move
   */
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isReady() || !document || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect) return;

      const currentPos: Position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (uiState.isDragging && uiState.dragStart && uiState.selectedElementId) {
        // Dragging element
        const delta = {
          x: currentPos.x - uiState.dragStart.x,
          y: currentPos.y - uiState.dragStart.y,
        };

        const selected = document.elements.find(
          (e) => e.id === uiState.selectedElementId
        );
        if (selected) {
          const newPos: Position = {
            x: selected.position.x + delta.x,
            y: selected.position.y + delta.y,
          };

          const operation = createMoveOperation(
            documentId,
            userId,
            getVersion(),
            selected.id,
            newPos
          );
          applyLocalOperation(operation);

          setUIState((prev) => ({
            ...prev,
            dragStart: currentPos,
          }));
        }
      } else if (uiState.isResizing && uiState.dragStart && uiState.resizeStart) {
        // Resizing element
        const delta = {
          x: currentPos.x - uiState.dragStart.x,
          y: currentPos.y - uiState.dragStart.y,
        };

        const newSize: Size = {
          width: Math.max(20, uiState.resizeStart.size.width + delta.x),
          height: Math.max(20, uiState.resizeStart.size.height + delta.y),
        };

        if (uiState.selectedElementId) {
          const operation = createResizeOperation(
            documentId,
            userId,
            getVersion(),
            uiState.selectedElementId,
            newSize
          );
          applyLocalOperation(operation);

          setUIState((prev) => ({
            ...prev,
            dragStart: currentPos,
          }));
        }
      } else if (uiState.isCreatingRect && uiState.createStart) {
        // Preview rectangle being created
        // This would be handled in the render loop
      }
    },
    [
      document,
      documentId,
      userId,
      uiState,
      applyLocalOperation,
      getVersion,
      isReady,
    ]
  );

  /**
   * Canvas mouse up
   */
  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isReady() || !document || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect) return;

      const currentPos: Position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (uiState.isCreatingRect && uiState.createStart) {
        // Finish creating rectangle
        const size: Size = {
          width: Math.abs(currentPos.x - uiState.createStart.x),
          height: Math.abs(currentPos.y - uiState.createStart.y),
        };

        if (size.width > 10 && size.height > 10) {
          const position: Position = {
            x: Math.min(uiState.createStart.x, currentPos.x),
            y: Math.min(uiState.createStart.y, currentPos.y),
          };

          const newElement: WhiteboardElement = {
            id: `elem-${crypto.randomUUID()}`,
            type: "rectangle",
            position,
            size,
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            updatedBy: userId,
            style: {
              fillColor: "#e0e7ff",
              strokeColor: "#4f46e5",
              strokeWidth: 2,
            },
          };

          const operation = createElementOperation(
            documentId,
            userId,
            getVersion(),
            newElement
          );
          applyLocalOperation(operation);
        }
      }

      setUIState((prev) => ({
        ...prev,
        selectedElementId: uiState.selectedElementId,
        isDragging: false,
        isResizing: false,
        dragStart: null,
        resizeStart: null,
        isCreatingRect: false,
        createStart: null,
      }));
    },
    [document, documentId, userId, uiState, applyLocalOperation, getVersion, isReady]
  );

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Text editing mode
      if (uiState.isEditingText) {
        if (e.key === "Escape") {
          // Save text and exit edit mode
          handleSaveTextElement();
          return;
        }
        if (e.key === "Enter" && e.ctrlKey) {
          handleSaveTextElement();
          return;
        }
        // Handle formatting shortcuts
        if (e.ctrlKey) {
          if (e.key === "b") {
            e.preventDefault();
            setUIState((prev) => ({
              ...prev,
              textFormatting: { ...prev.textFormatting, bold: !prev.textFormatting.bold },
            }));
          } else if (e.key === "i") {
            e.preventDefault();
            setUIState((prev) => ({
              ...prev,
              textFormatting: { ...prev.textFormatting, italic: !prev.textFormatting.italic },
            }));
          } else if (e.key === "u") {
            e.preventDefault();
            setUIState((prev) => ({
              ...prev,
              textFormatting: { ...prev.textFormatting, underline: !prev.textFormatting.underline },
            }));
          }
        }
        return;
      }

      // Normal mode
      if (e.key === "Delete" && uiState.selectedElementId && isReady() && document) {
        const operation = createDeleteOperation(
          documentId,
          userId,
          getVersion(),
          uiState.selectedElementId
        );
        applyLocalOperation(operation);
        setUIState((prev) => ({ ...prev, selectedElementId: null }));
      }

      // Double-click to edit text: Press 'T' to create text element
      if (e.key === "t" || e.key === "T") {
        setUIState((prev) => ({
          ...prev,
          isEditingText: true,
          textContent: "",
          textFormatting: {
            bold: false,
            italic: false,
            underline: false,
            bullet: false,
            fontSize: 16,
          },
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    uiState.selectedElementId,
    uiState.isEditingText,
    uiState.textContent,
    documentId,
    userId,
    applyLocalOperation,
    getVersion,
    isReady,
    document,
  ]);

  /**
   * Save text element
   */
  const handleSaveTextElement = useCallback(() => {
    if (!isReady() || !uiState.textContent.trim()) {
      setUIState((prev) => ({
        ...prev,
        isEditingText: false,
        editingElementId: null,
        textContent: "",
      }));
      return;
    }

    const textElement: WhiteboardElement = {
      id: `elem-${crypto.randomUUID()}`,
      type: "text",
      position: { x: 100, y: 100 },
      content: uiState.textContent,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: userId,
      style: {
        fontSize: uiState.textFormatting.fontSize,
        color: "#000000",
        bold: uiState.textFormatting.bold,
        italic: uiState.textFormatting.italic,
        underline: uiState.textFormatting.underline,
      },
    };

    const operation = createElementOperation(
      documentId,
      userId,
      getVersion(),
      textElement
    );
    applyLocalOperation(operation);

    setUIState((prev) => ({
      ...prev,
      isEditingText: false,
      editingElementId: null,
      textContent: "",
      textFormatting: {
        bold: false,
        italic: false,
        underline: false,
        bullet: false,
        fontSize: 16,
      },
    }));
  }, [uiState.textContent, uiState.textFormatting, isReady, documentId, userId, getVersion, applyLocalOperation]);

  /**
   * Handle formatting change
   */
  const handleFormatChange = useCallback(
    (format: keyof typeof uiState.textFormatting, value: boolean | number) => {
      setUIState((prev) => ({
        ...prev,
        textFormatting: { ...prev.textFormatting, [format]: value },
      }));
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="rounded-lg border border-slate-200 bg-white p-8">
          <p className="text-sm text-slate-600">Loading whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Collaborative Whiteboard
            </h1>
            <p className="text-sm text-slate-600">{documentId}</p>
          </div>
          <div className="flex gap-4">
            <div
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                isConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isConnected ? "✓ Connected" : "✗ Disconnected"}
            </div>
            <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">
              {userName}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-slate-100 p-8">
        <div className="mx-auto relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="cursor-crosshair border border-slate-300 bg-white shadow-lg"
            style={{ display: "block" }}
          />

          {/* Text Editor Overlay */}
          {uiState.isEditingText && (
            <div className="absolute top-8 left-8 z-10 space-y-2">
              <TextEditorToolbar
                formatting={uiState.textFormatting}
                onFormatChange={handleFormatChange}
                isActive={true}
              />
              <div className="rounded-lg border-2 border-blue-500 bg-white p-4 shadow-lg">
                <textarea
                  autoFocus
                  value={uiState.textContent}
                  onChange={(e) =>
                    setUIState((prev) => ({ ...prev, textContent: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleSaveTextElement();
                    if (e.key === "Enter" && e.ctrlKey) handleSaveTextElement();
                  }}
                  placeholder="Type text (Ctrl+Enter to save, Esc to cancel)"
                  className="w-96 h-64 rounded border border-slate-300 p-3 font-serif text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    fontWeight: uiState.textFormatting.bold ? "bold" : "normal",
                    fontStyle: uiState.textFormatting.italic ? "italic" : "normal",
                    textDecoration: uiState.textFormatting.underline ? "underline" : "none",
                    fontSize: `${uiState.textFormatting.fontSize}px`,
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleSaveTextElement}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                  >
                    Save Text
                  </button>
                  <button
                    onClick={() =>
                      setUIState((prev) => ({
                        ...prev,
                        isEditingText: false,
                        textContent: "",
                      }))
                    }
                    className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="mx-auto max-w-7xl text-xs text-slate-600">
          <p>
            💡 Drag to move elements • Drag corner handle to resize • Drag on
            empty space to create rectangles • <strong>Press T</strong> to add formatted text • Press Delete to remove selected element
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper functions
 */

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const gridSize = 20;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 0.5;

  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  isSelected: boolean
) {
  ctx.save();

  if (element.rotation) {
    ctx.translate(element.position.x, element.position.y);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-element.position.x, -element.position.y);
  }

  switch (element.type) {
    case "rectangle":
      drawRectangle(ctx, element, isSelected);
      break;

    case "circle":
      drawCircle(ctx, element, isSelected);
      break;

    case "text":
      drawText(ctx, element, isSelected);
      break;
  }

  ctx.restore();
}

function drawRectangle(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  isSelected: boolean
) {
  const { position, size, style } = element;
  if (!size) return;

  ctx.fillStyle = style?.fillColor ?? "#e0e7ff";
  ctx.fillRect(position.x, position.y, size.width, size.height);

  ctx.strokeStyle = isSelected
    ? "#2563eb"
    : (style?.strokeColor ?? "#4f46e5");
  ctx.lineWidth = style?.strokeWidth ?? 2;
  ctx.strokeRect(position.x, position.y, size.width, size.height);
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  isSelected: boolean
) {
  const { position, size, style } = element;
  if (!size) return;

  const radius = Math.min(size.width, size.height) / 2;

  ctx.fillStyle = style?.fillColor ?? "#e0e7ff";
  ctx.beginPath();
  ctx.arc(
    position.x + size.width / 2,
    position.y + size.height / 2,
    radius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.strokeStyle = isSelected
    ? "#2563eb"
    : (style?.strokeColor ?? "#4f46e5");
  ctx.lineWidth = style?.strokeWidth ?? 2;
  ctx.stroke();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  isSelected: boolean
) {
  const { position, content, style } = element;

  ctx.fillStyle = style?.color ?? "#000000";
  ctx.font = `${style?.bold ? "bold " : ""}${style?.italic ? "italic " : ""}${style?.fontSize ?? 14}px Arial`;
  
  // Handle multiline text
  const lines = (content ?? "").split("\n");
  let yOffset = position.y;
  
  lines.forEach((line) => {
    if (line.startsWith("•")) {
      ctx.fillText(line, position.x + 10, yOffset);
    } else {
      ctx.fillText(line, position.x, yOffset);
    }
    yOffset += (style?.fontSize ?? 14) + 4;
  });

  if (isSelected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1;
    const metrics = ctx.measureText(content ?? "Text");
    ctx.strokeRect(position.x - 2, position.y - 14, metrics.width + 4, 18);
  }
}

function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement
) {
  if (element.type !== "rectangle" || !element.size) return;

  const handleSize = 8;
  const { position, size } = element;

  ctx.fillStyle = "#2563eb";

  // Corner handles
  const corners = [
    { x: position.x, y: position.y },
    {
      x: position.x + size.width,
      y: position.y,
    },
    {
      x: position.x,
      y: position.y + size.height,
    },
    {
      x: position.x + size.width,
      y: position.y + size.height,
    },
  ];

  corners.forEach((corner) => {
    ctx.fillRect(
      corner.x - handleSize / 2,
      corner.y - handleSize / 2,
      handleSize,
      handleSize
    );
  });
}

function isPointInElement(pos: Position, element: WhiteboardElement): boolean {
  const { position, size } = element;

  if (!size) {
    // Point elements
    return (
      Math.abs(pos.x - position.x) < 5 && Math.abs(pos.y - position.y) < 5
    );
  }

  return (
    pos.x >= position.x &&
    pos.x <= position.x + size.width &&
    pos.y >= position.y &&
    pos.y <= position.y + size.height
  );
}

function isPointInResizeHandle(pos: Position, element: WhiteboardElement): boolean {
  if (element.type !== "rectangle" || !element.size) return false;

  const handleSize = 12;
  const { position, size } = element;

  // Bottom-right corner
  return (
    pos.x >= position.x + size.width - handleSize &&
    pos.x <= position.x + size.width + handleSize &&
    pos.y >= position.y + size.height - handleSize &&
    pos.y <= position.y + size.height + handleSize
  );
}
