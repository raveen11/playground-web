"use client";

import { useState } from "react";
import {
  IconLayers,
  IconServer,
  IconZap,
  IconDatabase,
  IconSparkles,
  IconShield,
  IconTerminal,
  IconCpu,
  IconCode,
} from "./Icons";

export default function EngineeringSection() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const engineeringPrinciples = [
    {
      title: "Frontend Architecture",
      icon: <IconLayers className="w-4 h-4 text-sky-400" />,
      desc: "Modular component hierarchies, strict TypeScript contracts, reusable design systems, and responsive layout patterns.",
    },
    {
      title: "Backend & REST APIs",
      icon: <IconServer className="w-4 h-4 text-emerald-400" />,
      desc: "Node.js and Express services with type-safe route controllers, Zod payload validation, and clean layered service architecture.",
    },
    {
      title: "Realtime Systems & WebSockets",
      icon: <IconZap className="w-4 h-4 text-amber-400" />,
      desc: "Bi-directional event multiplexing, optimistic client updates, heartbeat liveness timers, and room-scoped pub/sub routing.",
    },
    {
      title: "Database Design & ORM",
      icon: <IconDatabase className="w-4 h-4 text-rose-400" />,
      desc: "Relational modeling in PostgreSQL, indexed foreign keys, Prisma migrations, and atomic ACID transaction boundaries.",
    },
    {
      title: "AI & RAG Ingestion",
      icon: <IconSparkles className="w-4 h-4 text-purple-400" />,
      desc: "Vector chunking strategies, embedding generation via OpenAI, cosine similarity retrieval, and Markdown context augmentation.",
    },
    {
      title: "Security & Multi-Tenancy",
      icon: <IconShield className="w-4 h-4 text-cyan-400" />,
      desc: "HTTP-only secure cookie sessions, company-scoped queries, token signing, and granular role authorization checks.",
    },
    {
      title: "Performance & Optimizations",
      icon: <IconCpu className="w-4 h-4 text-indigo-400" />,
      desc: "Next.js dynamic imports, lazy Monaco loading, memoized canvas rendering, and minimized bundle sizes.",
    },
    {
      title: "Tooling & DX",
      icon: <IconTerminal className="w-4 h-4 text-lime-400" />,
      desc: "pnpm monorepo workspaces, shared schemas, zero-drift contract testing, and strict TypeScript compiler settings.",
    },
  ];

  const architectureFlow = [
    {
      label: "1. Client Layer",
      subtitle: "Next.js 15 & React 19",
      details: "Renders responsive Kanban boards, React Flow canvas, Monaco code editors, and RAG search UI. Manages optimistic UI updates.",
      tech: "Next.js, React, Tailwind CSS, React Flow, Monaco",
    },
    {
      label: "2. Transport Gateway",
      subtitle: "HTTP REST + WebSocket Hub",
      details: "Single persistent WebSocket connection multiplexes Board, Chat, Presence, and Paper Doc messages over unified frame protocol.",
      tech: "WebSocket Client, Fetch API, Cookies",
    },
    {
      label: "3. Server Engine",
      subtitle: "Node.js & Express Router",
      details: "Handles authentication, room lifecycle management, in-memory presence maps, event validation with Zod, and message broadcasting.",
      tech: "Node.js, Express, ws, Zod Schemas",
    },
    {
      label: "4. Storage & AI Layer",
      subtitle: "PostgreSQL, Prisma & Vector Embeddings",
      details: "Stores users, companies, boards, tickets, and document embeddings. Handles vector similarity lookups and conversational AI context.",
      tech: "PostgreSQL (Supabase), Prisma ORM, OpenAI RAG",
    },
  ];

  return (
    <section id="engineering" className="py-20 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
            <span>05.</span>
            <span>Engineering Principles</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            How I Build Software
          </h2>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            A methodical approach prioritizing predictable state, modular boundaries, type safety,
            and reliable asynchronous architectures.
          </p>
        </div>

        {/* 8-card Engineering Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {engineeringPrinciples.map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-dark)] hover:bg-[var(--card-hover)] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-[var(--code-bg)] border border-[var(--border)]">
                    {item.icon}
                  </div>
                  <h3 className="text-xs font-bold text-[var(--foreground)] tracking-tight">
                    {item.title}
                  </h3>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Architecture Visualization Panel */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--code-bg)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--foreground)]">
              <IconCode className="w-4 h-4 text-sky-400" />
              <span className="font-semibold">System Architecture: Playground Web Monorepo</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--muted)]">
              Data Flow & Multiplexing
            </span>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Architecture Pipeline Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {architectureFlow.map((step, idx) => (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    activeStep === idx
                      ? "border-sky-500 bg-sky-500/10 shadow-md"
                      : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--muted-dark)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-400">
                      {step.label}
                    </span>
                    {idx < 3 && (
                      <span className="hidden md:inline font-mono text-xs text-[var(--muted-dark)]">
                        →
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-[var(--foreground)]">
                    {step.subtitle}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-[var(--muted)] truncate">
                    {step.tech}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Step Deep Dive Card */}
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--code-bg)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-xs font-mono font-bold text-[var(--foreground)]">
                    {architectureFlow[activeStep].label}: {architectureFlow[activeStep].subtitle}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-sky-400">
                  Tech: {architectureFlow[activeStep].tech}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {architectureFlow[activeStep].details}
              </p>
            </div>

            {/* Realtime WebSocket Protocol Spec Visualizer */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--foreground)] font-semibold flex items-center gap-2">
                  <IconZap className="w-3.5 h-3.5 text-amber-400" />
                  Realtime Multiplexing Protocol (WORKFLOW.md)
                </span>
                <span className="text-[10px] text-[var(--muted)]">Single TCP Pipe • Room Subscriptions</span>
              </div>

              <div className="bg-[var(--code-bg)] p-3.5 rounded-lg border border-[var(--border)] font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
                <div className="text-slate-500">{"// 1. Client connects once and introduces session"}</div>
                <div><span className="text-sky-400">send</span>(&#123; type: <span className="text-emerald-300">&quot;room:join&quot;</span>, roomId: <span className="text-amber-300">&quot;main-board&quot;</span>, user: &#123; id, name, role &#125; &#125;)</div>
                <div className="mt-2 text-slate-500">{"// 2. Server acknowledges and synchronizes initial snapshot"}</div>
                <div><span className="text-purple-400">emit</span>(&#123; type: <span className="text-emerald-300">&quot;sync:state&quot;</span>, columns: [...], cards: [...] &#125;)</div>
                <div><span className="text-purple-400">emit</span>(&#123; type: <span className="text-emerald-300">&quot;presence:update&quot;</span>, users: [...] &#125;)</div>
                <div className="mt-2 text-slate-500">{"// 3. Client and server exchange incremental deltas"}</div>
                <div><span className="text-sky-400">send</span>(&#123; type: <span className="text-emerald-300">&quot;card:move&quot;</span>, cardId, toColumnId, targetIndex &#125;)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
