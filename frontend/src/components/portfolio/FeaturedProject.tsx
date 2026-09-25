"use client";

import Link from "next/link";
import {
  IconZap,
  IconLayers,
  IconGithub,
  IconArrowUpRight,
  IconUsers,
  IconCode,
  IconSparkles,
} from "./Icons";

export default function FeaturedProject() {
  const modules = [
    {
      title: "Multiplayer Kanban",
      badge: "Realtime Sync",
      desc: "Live board with optimistic drag & drop, column sorting, task status updates, and multiplayer presence sync over WebSockets.",
      route: "/playground",
      icon: <IconLayers className="w-4 h-4 text-sky-400" />,
      tag: "Live Room Sync",
    },
    {
      title: "Collaborative Code Canvas",
      badge: "React Flow + Monaco",
      desc: "Infinite whiteboard canvas with embedded Monaco code editors, multi-language support, real-time sync, and folder AST import.",
      route: "/whiteboard",
      icon: <IconCode className="w-4 h-4 text-emerald-400" />,
      tag: "Infinite Canvas",
    },
    {
      title: "Document RAG Intelligence",
      badge: "Vector AI Search",
      desc: "Upload technical documentation and markdown files, vectorize content, and perform conversational AI retrieval queries.",
      route: "/document",
      icon: <IconSparkles className="w-4 h-4 text-purple-400" />,
      tag: "AI Context",
    },
    {
      title: "Multi-User Presence & Chat",
      badge: "Low-Latency WS",
      desc: "Real-time user presence tracking, active room participants, typing indicator broadcasts, and shared paper doc notes.",
      route: "/playground",
      icon: <IconUsers className="w-4 h-4 text-amber-400" />,
      tag: "Multiplayer Engine",
    },
  ];

  const techStack = [
    "Next.js 15",
    "React 19",
    "TypeScript",
    "Node.js",
    "WebSockets",
    "PostgreSQL",
    "Prisma ORM",
    "Supabase",
    "Monaco Editor",
    "React Flow",
    "Zod",
    "Tailwind CSS",
  ];

  return (
    <section id="featured-project" className="py-20 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
              <span>03.</span>
              <span>Flagship Workspace</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Featured Project: Playground Web
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
              A collaborative developer workspace and personal engineering laboratory exploring
              realtime collaboration, code editing, project management, AI/RAG, and modern full-stack architecture.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-xs transition-colors"
            >
              <IconZap className="w-3.5 h-3.5" />
              <span>Launch Playground</span>
            </Link>
            <a
              href="https://github.com/raveen11/playground-web"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] font-medium text-xs transition-colors"
            >
              <IconGithub className="w-3.5 h-3.5" />
              <span>Source Code</span>
            </a>
          </div>
        </div>

        {/* Main Featured Container */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-xl">
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--code-bg)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-[var(--foreground)]">
                playground-web / architecture-sandbox
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v0.1.0 • Monorepo
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
              <span>Status:</span>
              <span className="text-emerald-400 font-medium">Production Ready & Live</span>
            </div>
          </div>

          {/* Interactive Feature Cards Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="group relative p-5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-sky-500/40 hover:bg-[var(--card-hover)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                        {mod.icon}
                      </div>
                      <h3 className="text-sm font-bold text-[var(--foreground)] group-hover:text-sky-400 transition-colors">
                        {mod.title}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--code-bg)] text-[var(--muted)]">
                      {mod.badge}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
                    {mod.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-[var(--muted-dark)]">{mod.tag}</span>
                  <Link
                    href={mod.route}
                    className="inline-flex items-center gap-1 font-mono text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
                  >
                    <span>Open Module</span>
                    <IconArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Highlights & Tech Stack Strip */}
          <div className="px-6 py-5 border-t border-[var(--border)] bg-[var(--code-bg)]/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--muted-dark)]">
                Core Technologies & Protocol
              </span>
              <a
                href="#engineering"
                className="text-xs font-mono text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>Read Full Technical Architecture Spec</span>
                <span>→</span>
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-md text-xs font-mono border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
