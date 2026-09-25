"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PresenceUser } from "@kanban/shared";

import Board from "@/components/board/Board";
import ChatPanel from "@/components/chat/ChatPanel";
import PaperDoc from "@/components/paper/PaperDoc";
import SocialMediaPanel from "@/components/social/SocialMediaPanel";
import type { ChatMessage, WebSocketClient } from "@/websocket";
import { useRoomJoin } from "@/websocket/useRoomJoin";
import { api, type CompanyUser, type BoardData } from "@/lib/apiClient";

type Role = "viewer" | "editor" | "admin";

type User = {
  userId: string;
  name: string;
  role: Role;
  email?: string;
};

const DEFAULT_BOARD_ID = "main-board";
const ROLES: Role[] = ["viewer", "editor", "admin"];

export default function Dashboard({
  wsClient,
  wsConnected,
}: {
  wsClient: WebSocketClient | null;
  wsConnected: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<Role>("editor");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>(DEFAULT_BOARD_ID);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Check if user is already authenticated with backend
  useEffect(() => {
    async function initUser() {
      try {
        const meRes = await api.auth.me();
        if (meRes?.user) {
          setUser({
            userId: meRes.user.id,
            name: meRes.user.name,
            role: (meRes.user.role === "company_admin" || meRes.user.role === "super_admin"
              ? "admin"
              : "editor") as Role,
            email: meRes.user.email,
          });
          setIsAuthenticated(true);
        }
      } catch {
        // Not authenticated yet
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    initUser();
  } , []);

  // 2. Load boards and company users from PostgreSQL
  useEffect(() => {
    async function loadData() {
      try {
        const boardList = await api.boards.list();
        setBoards(boardList);
        if (boardList.length > 0) {
          setActiveBoardId(boardList[0].id);
        }
      } catch (err) {
        console.error("Failed to load boards from PostgreSQL:", err);
      }

      try {
        const users = await api.company.listUsers();
        setCompanyUsers(users);
      } catch {
        // Silently fail if unauthenticated
      }
    }

    loadData();
  }, [user]);

  // 3. Load chat messages from PostgreSQL when active board is chosen
  useEffect(() => {
    if (!activeBoardId) return;
    api.chat
      .listMessages(activeBoardId)
      .then((msgs) => {
        setChatMessages(
          msgs.map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.name,
            color: "#64748b",
            text: m.text,
            sentAt: m.sentAt,
          })),
        );
      })
      .catch(() => setChatMessages([]));
  }, [activeBoardId]);

  // One room join for the active board
  useRoomJoin(wsClient, wsConnected, user, activeBoardId);

  // Presence and error listeners
  useEffect(() => {
    if (!wsClient) return;

    const unsubs = [
      wsClient.on("presence:update", (msg) => setPresence(msg.users)),
      wsClient.on("error", (msg) =>
        setError(msg.message ?? "Something went wrong."),
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [wsClient]);

  const handleGuestJoin = () => {
    if (!nameInput.trim()) {
      setError("Please enter your name.");
      return;
    }

    const nextUser: User = {
      userId: crypto.randomUUID(),
      name: nameInput.trim(),
      role: roleInput,
    };
    setUser(nextUser);
    setError(null);
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignored
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
        Initializing workspace...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
        <div className="mx-auto flex max-w-lg flex-col gap-8 rounded-[32px] border border-slate-200 bg-white p-10 shadow-lg">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">
                Realtime Workspace
              </h1>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Prisma + PostgreSQL
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Sign in with your company account or continue as a guest collaborator.
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50/70 p-4 text-xs text-blue-800 border border-blue-100 flex items-center justify-between">
            <span>Already have an account?</span>
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white transition hover:bg-blue-700"
            >
              Log in
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or guest join</span>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Your Name
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                placeholder="e.g. Alex Smith"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Role
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as Role)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handleGuestJoin}
              className="mt-2 rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Continue to Workspace
            </button>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 sm:px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Top Navigation / Dashboard Banner */}
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                  PlaygroundWeb Architecture
                </p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  PostgreSQL Source of Truth
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Collaborative Dashboard
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Persistent PostgreSQL database via Prisma ORM • Realtime WebSockets for live sync
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Portfolio</span>
              </Link>
              {boards.length > 1 ? (
                <select
                  value={activeBoardId}
                  onChange={(e) => setActiveBoardId(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : null}

              <div className="rounded-2xl bg-slate-50 px-4 py-2 text-xs text-slate-700 flex items-center gap-2 border border-slate-100">
                <span className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{user.role}</div>
                </div>
              </div>

              <div
                className="rounded-2xl px-3.5 py-2 text-xs font-bold text-white shadow-xs"
                style={{
                  backgroundColor: wsConnected ? "#16a34a" : "#ea580c",
                }}
              >
                {wsConnected ? "● Live WS" : "○ Offline"}
              </div>

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Log In
                </Link>
              )}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        {wsClient ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Main Content: Kanban Board & Shared Collaborative Doc */}
            <div className="space-y-6">
              <Board
                ws={wsClient}
                user={user}
                boardId={activeBoardId}
                companyUsers={companyUsers}
              />
              <PaperDoc
                ws={wsClient}
                userId={user.userId}
                boardId={activeBoardId}
              />
            </div>

            {/* Sidebar: Live Participants, Team Chat, Social Media */}
            <aside className="space-y-6">
              {/* Live Participants */}
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Live Participants
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                    {presence.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {presence.length ? (
                    presence.map((person) => (
                      <div
                        key={person.userId}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                      >
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {person.name}
                          </div>
                          <div className="text-[10px] text-slate-500 capitalize">
                            {person.role}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-400">
                      No other participants currently connected.
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Panel */}
              <ChatPanel
                ws={wsClient}
                user={user}
                boardId={activeBoardId}
                presence={presence}
                initialMessages={chatMessages}
              />

              {/* Social Media Integration */}
              <SocialMediaPanel />
            </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}
