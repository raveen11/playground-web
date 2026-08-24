"use client";

/**
 * Whiteboard Route
 * Real-time collaborative code canvas: React Flow for the surface, Monaco
 * editors as draggable nodes, and the existing whiteboard operation pipeline
 * for synchronisation.
 */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Monaco and React Flow are browser-only, so the canvas never renders on the server.//this is test
const CodeCanvas = dynamic(
  () => import("../../components/whiteboard/CodeCanvas").then((module) => module.CodeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-screen place-items-center bg-slate-50 text-sm text-slate-500">
        Loading canvas…
      </div>
    ),
  }
);

const USER_ID_STORAGE_KEY = "codeCanvasUserId";
const DEFAULT_DOCUMENT_ID = "default-canvas";
const DEFAULT_WS_PORT = "3002";

function resolveWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured) return configured;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:${DEFAULT_WS_PORT}`;
}

export default function WhiteboardPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [documentId, setDocumentId] = useState(DEFAULT_DOCUMENT_ID);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (saved) {
      setUserId(saved);
      return;
    }

    const generated = `user-${crypto.randomUUID()}`;
    setUserId(generated);
    localStorage.setItem(USER_ID_STORAGE_KEY, generated);
  }, []);

  const wsUrl = useMemo(() => (mounted ? resolveWsUrl() : ""), [mounted]);

  const handleJoin = () => {
    const name = userNameInput.trim();
    const canvas = documentId.trim();
    if (!name || !canvas) return;

    setUserName(name);
    setDocumentId(canvas);
    setIsJoined(true);
  };

  if (!mounted) return null;

  if (!isJoined) {
    return (
      <main className="grid h-screen place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">Collaborative Code Canvas</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Drop code editors onto an infinite canvas and type together in real time.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="user-name" className="block text-sm font-medium text-slate-700">
                Your name
              </label>
              <input
                id="user-name"
                type="text"
                value={userNameInput}
                onChange={(event) => setUserNameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleJoin();
                }}
                placeholder="Enter your name"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-slate-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="canvas-id" className="block text-sm font-medium text-slate-700">
                Canvas
              </label>
              <input
                id="canvas-id"
                type="text"
                value={documentId}
                onChange={(event) => setDocumentId(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleJoin();
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-slate-500 focus:bg-white focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Everyone using the same canvas name edits the same document.
              </p>
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={!userNameInput.trim() || !documentId.trim()}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Open canvas
            </button>

            <div className="rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600">
              <p className="font-semibold">How to try it</p>
              <ul className="mt-1 space-y-1">
                <li>• Drag a code block from the palette onto the canvas</li>
                <li>• Open this page in a second tab to collaborate</li>
                <li>• Typing, moving and resizing sync instantly</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <CodeCanvas
      documentId={documentId}
      userId={userId}
      userName={userName}
      wsUrl={wsUrl}
    />
  );
}
