"use client";

import Link from "next/link";
import {
  IconLayers,
  IconCode,
  IconSparkles,
  IconFolder,
  IconArrowUpRight,
  IconActivity,
} from "./Icons";

export default function PlaygroundSection() {
  const interactiveModules = [
    {
      title: "Multiplayer Kanban & Workspace",
      category: "Realtime Collaboration",
      description:
        "Full collaborative workspace featuring real-time drag-and-drop boards, multi-user presence cursors, instant chat with typing indicators, and shared scratchpad documents.",
      route: "/playground",
      badge: "WebSocket Hub",
      icon: <IconLayers className="w-5 h-5 text-sky-400" />,
      actionText: "Open Kanban Workspace",
      features: ["Drag & Drop Cards", "Live Presence List", "Room Chat", "Paper Doc"],
    },
    {
      title: "Collaborative Code Canvas",
      category: "Visual Developer Tool",
      description:
        "Infinite node canvas built on React Flow with embedded multi-language Monaco editors. Write code collaboratively, arrange architectural nodes, and import local codebases.",
      route: "/whiteboard",
      badge: "React Flow + Monaco",
      icon: <IconCode className="w-5 h-5 text-emerald-400" />,
      actionText: "Launch Code Canvas",
      features: ["Infinite Zoom/Pan", "Monaco Syntax", "Live Sync", "Node Palette"],
    },
    {
      title: "RAG Document Intelligence",
      category: "AI & Vector Search",
      description:
        "Interactive document knowledge base. Upload technical specifications and markdown guides, query with natural language, and retrieve AI answers grounded in your documentation.",
      route: "/document",
      badge: "OpenAI + Vector RAG",
      icon: <IconSparkles className="w-5 h-5 text-purple-400" />,
      actionText: "Explore Document RAG",
      features: ["File Vectorization", "Semantic Search", "Context QA", "Markdown View"],
    },
    {
      title: "Project Folder Importer",
      category: "AST & File System",
      description:
        "Import directory trees from your local machine via the File System Access API. Parses folder hierarchies and generates interactive visual node trees.",
      route: "/random",
      badge: "File System API",
      icon: <IconFolder className="w-5 h-5 text-amber-400" />,
      actionText: "Try Folder Importer",
      features: ["Local File Access", "Recursive Tree AST", "File Preview", "Node Graphs"],
    },
    {
      title: "2D Physics & Canvas Lab",
      category: "Interactive Simulation",
      description:
        "Experimental HTML5 2D canvas simulation testing state update loops, delta-time calculation, physics velocity, and responsive viewport coordinate transforms.",
      route: "/game",
      badge: "HTML5 Canvas Engine",
      icon: <IconActivity className="w-5 h-5 text-rose-400" />,
      actionText: "Play Canvas Simulation",
      features: ["Game Loop", "Collision Math", "Viewport Scaling", "State Machine"],
    },
  ];

  return (
    <section id="playground" className="py-20 border-t border-[var(--border)] relative bg-[var(--card)]/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
              <span>06.</span>
              <span>Interactive Engineering Laboratory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Explore My Playground
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
              An interactive environment where I experiment with realtime collaboration, editors,
              AI retrieval, data synchronization, and full-stack systems. Click any module below to test it live.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Interactive Sandbox Active</span>
          </div>
        </div>

        {/* Playground Interactive Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interactiveModules.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 hover:border-sky-500/50 hover:bg-[var(--card-hover)] transition-all flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)]">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--code-bg)] text-[var(--muted)]">
                    {item.badge}
                  </span>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 mb-1">
                    {item.category}
                  </div>
                  <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-sky-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Features list */}
                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {item.features.map((feat) => (
                    <span
                      key={feat}
                      className="text-[10px] font-mono text-[var(--muted)] flex items-center gap-1"
                    >
                      <span className="text-sky-400">•</span> {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-4 border-t border-[var(--border)]">
                <Link
                  href={item.route}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] group-hover:border-sky-500/40 group-hover:bg-sky-500/10 text-xs font-mono font-semibold text-[var(--foreground)] group-hover:text-sky-400 transition-all"
                >
                  <span>{item.actionText}</span>
                  <IconArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
