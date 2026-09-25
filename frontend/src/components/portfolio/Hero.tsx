"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconTerminal,
  IconZap,
  IconLayers,
  IconCheck,
} from "./Icons";

export default function Hero() {
  const [activeTab, setActiveTab] = useState<"engineer" | "stack" | "architecture">("engineer");
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    engineer: `const engineer = {
  name: "Raveen Neupane",
  title: "Frontend / Full-Stack Engineer",
  focus: ["Realtime Systems", "Developer Tools", "AI / RAG"],
  currentRole: "Software Engineer / Team Lead @ Treeleaf",
  status: "Exploring distributed architectures & AI workflows"
};`,
    stack: `const techStack = {
  frontend: ["React 19", "Next.js 15", "TypeScript", "Tailwind CSS"],
  backend: ["Node.js", "Express", "REST APIs", "Zod"],
  realtime: ["WebSockets", "Multiplayer Sync", "Presence"],
  storage: ["PostgreSQL", "Prisma ORM", "Supabase", "IndexedDB"],
  ai: ["OpenAI API", "Vector Embeddings", "RAG Pipelines"]
};`,
    architecture: `// PlaygroundWeb Monorepo Architecture
// [Client] Next.js (React 19)
//    │ HTTP & WS Multiplexing
//    ▼
// [Server] Node.js + WebSocket Gateway
//    │ Prisma ORM
//    ▼
// [Storage] PostgreSQL (Supabase) + Vector Search + In-Memory Room State`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Subtle background grid accent */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Bio & Calls to Action */}
          <div className="lg:col-span-7 space-y-6">
            {/* Availability status badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Available for engineering opportunities & collaborations</span>
            </div>

            {/* Main Headings */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--foreground)]">
                Raveen Neupane
              </h1>
              <p className="text-xl sm:text-2xl font-medium text-sky-400 font-mono">
                Frontend / Full-Stack Engineer
              </p>
            </div>

            {/* Core Value Proposition */}
            <p className="text-base sm:text-lg text-[var(--muted)] leading-relaxed max-w-xl">
              I build modern web applications with React, Next.js, TypeScript, Node.js,
              realtime systems, and AI-powered technologies.
            </p>

            <p className="text-sm text-[var(--muted-dark)] leading-relaxed max-w-xl font-mono">
              Currently exploring backend architecture, distributed systems, AI/RAG, and developer tooling.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <a
                href="#work"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <span>Explore My Work</span>
                <IconArrowRight className="w-4 h-4" />
              </a>

              <Link
                href="/playground"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 font-medium text-sm hover:bg-sky-500/20 hover:border-sky-500 transition-all"
              >
                <IconZap className="w-4 h-4" />
                <span>Open Playground</span>
              </Link>

              <a
                href="#engineering"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] font-medium text-sm hover:text-[var(--foreground)] hover:border-[var(--muted-dark)] transition-colors"
              >
                <IconLayers className="w-4 h-4" />
                <span>View Architecture</span>
              </a>
            </div>

            {/* Key Snapshot Stats / Highlights */}
            <div className="pt-6 border-t border-[var(--border)] grid grid-cols-3 gap-4 max-w-lg">
              <div>
                <div className="font-mono text-lg font-bold text-[var(--foreground)]">4+ Years</div>
                <div className="text-xs text-[var(--muted)]">Engineering Experience</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-[var(--foreground)]">Treeleaf</div>
                <div className="text-xs text-[var(--muted)]">Frontend Team Lead</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-sky-400">Realtime + AI</div>
                <div className="text-xs text-[var(--muted)]">Architecture Focus</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Code Editor Panel */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
              {/* Window Header */}
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--code-bg)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-xs text-[var(--muted)] flex items-center gap-1">
                    <IconTerminal className="w-3 h-3" />
                    engineer.ts
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs font-mono text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-[var(--card)]"
                  title="Copy snippet"
                >
                  {copied ? (
                    <>
                      <IconCheck className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
              </div>

              {/* Tabs for inspecting engineer profile / tech stack / architecture */}
              <div className="flex border-b border-[var(--border)] bg-[var(--card)] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab("engineer")}
                  className={`px-4 py-2 border-r border-[var(--border)] transition-colors ${
                    activeTab === "engineer"
                      ? "bg-[var(--code-bg)] text-sky-400 border-b-2 border-b-sky-400"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  engineer.ts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("stack")}
                  className={`px-4 py-2 border-r border-[var(--border)] transition-colors ${
                    activeTab === "stack"
                      ? "bg-[var(--code-bg)] text-sky-400 border-b-2 border-b-sky-400"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  techStack.ts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("architecture")}
                  className={`px-4 py-2 transition-colors ${
                    activeTab === "architecture"
                      ? "bg-[var(--code-bg)] text-sky-400 border-b-2 border-b-sky-400"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  architecture.ts
                </button>
              </div>

              {/* Code Body */}
              <div className="p-4 bg-[var(--code-bg)] overflow-x-auto text-xs font-mono leading-relaxed text-slate-300">
                <pre>
                  <code>{codeSnippets[activeTab]}</code>
                </pre>
              </div>

              {/* Bottom Quick Links to Playground Modules */}
              <div className="p-3 border-t border-[var(--border)] bg-[var(--card)]/50 flex items-center justify-between text-xs font-mono text-[var(--muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Try live demo
                </span>
                <div className="flex items-center gap-3">
                  <Link href="/playground" className="hover:text-sky-400 transition-colors">
                    Kanban →
                  </Link>
                  <Link href="/whiteboard" className="hover:text-sky-400 transition-colors">
                    Canvas →
                  </Link>
                  <Link href="/document" className="hover:text-sky-400 transition-colors">
                    RAG →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
