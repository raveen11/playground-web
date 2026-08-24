"use client";

/**
 * Whiteboard Page
 * Collaborative whiteboard demo page
 */

import { useEffect, useState } from "react";
import { Whiteboard } from "../../components/whiteboard/Whiteboard";

export default function WhiteboardPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [documentId, setDocumentId] = useState<string>("default-doc");
  const [isJoined, setIsJoined] = useState(false);
  const [userNameInput, setUserNameInput] = useState("");

  useEffect(() => {
    setMounted(true);
    // Generate or load user ID
    const saved = localStorage.getItem("whiteboardUserId");
    if (saved) {
      setUserId(saved);
    } else {
      const newId = `user-${crypto.randomUUID()}`;
      setUserId(newId);
      localStorage.setItem("whiteboardUserId", newId);
    }
  }, []);

  const handleJoin = () => {
    if (userNameInput.trim()) {
      setUserName(userNameInput.trim());
      setIsJoined(true);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isJoined) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">
            Collaborative Whiteboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Join the real-time collaborative whiteboard to draw and edit together.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Your Name
              </label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
                placeholder="Enter your name"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-slate-500 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              onClick={handleJoin}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Join Whiteboard
            </button>

            <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
              <p className="font-semibold">💡 Tips:</p>
              <ul className="mt-1 space-y-1">
                <li>• Open this page in multiple tabs to test collaboration</li>
                <li>• Draw rectangles by dragging on empty space</li>
                <li>• Drag elements to move them in real-time</li>
                <li>• All changes sync instantly across tabs</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const wsUrl = (() => {
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `${protocol}://${host}:3001`;
  })();

  return (
    <Whiteboard
      documentId={documentId}
      userId={userId}
      wsUrl={wsUrl}
      userName={userName}
    />
  );
}
