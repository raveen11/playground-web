import { IconZap, IconTerminal, IconSparkles, IconLayers } from "./Icons";

export default function EngineeringLabs() {
  const experiments = [
    {
      name: "WebSocket Room Multiplexing Lab",
      status: "Exploration Complete",
      tag: "Realtime Protocol",
      explored:
        "Multiplexing board cards, chat messages, typing status, and paper document diffs through one persistent client WebSocket rather than separate socket instances.",
      tech: "Node.js ws, Custom Event Router, Zod schemas",
      learned:
        "Significantly reduced TCP handshake overhead, eliminated connection thrashing on page navigation, and simplified client lifecycle cleanup to a single disconnect listener.",
      icon: <IconZap className="w-4 h-4 text-amber-400" />,
    },
    {
      name: "RAG Chunking & Semantic Context Lab",
      status: "Iterating",
      tag: "AI / Vector Search",
      explored:
        "Evaluating fixed-size character chunking vs markdown-aware heading boundaries when generating embeddings for technical software documentation.",
      tech: "OpenAI Embeddings, Postgres pgvector, Cosine Distance",
      learned:
        "Heading-aware semantic boundaries retain significantly higher answer accuracy for multi-step technical instructions compared to naive 500-token chunk splits.",
      icon: <IconSparkles className="w-4 h-4 text-purple-400" />,
    },
    {
      name: "Monaco React Flow State Sync Lab",
      status: "In Production",
      tag: "Canvas Engineering",
      explored:
        "Embedding full Monaco Editor instances inside draggable React Flow nodes while maintaining 60fps canvas zooming, panning, and multiplayer typing broadcasts.",
      tech: "React Flow, @monaco-editor/react, Debounced WS Diffs",
      learned:
        "Isolated Monaco rendering inside memoized custom node containers and debounced non-critical cursor position updates to avoid canvas layout thrashing.",
      icon: <IconLayers className="w-4 h-4 text-emerald-400" />,
    },
    {
      name: "File System API & Directory AST Lab",
      status: "Exploration Complete",
      tag: "Browser APIs",
      explored:
        "Using the browser's Native File System Access API to recursively scan directory handles and construct abstract syntax tree node representations.",
      tech: "Web File System Access API, Recursive Async Traversers",
      learned:
        "Yielding the main thread during deep folder traversal is essential to prevent UI freezing on codebases with over 2,000 files.",
      icon: <IconTerminal className="w-4 h-4 text-sky-400" />,
    },
  ];

  return (
    <section id="labs" className="py-20 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
            <span>07.</span>
            <span>R&D & Experiments</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Engineering Labs
          </h2>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Targeted experiments exploring protocol limits, browser APIs, vector retrieval, and interface architectures.
          </p>
        </div>

        {/* Experiments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {experiments.map((exp) => (
            <div
              key={exp.name}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 hover:border-[var(--muted-dark)] transition-colors"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--code-bg)] border border-[var(--border)]">
                    {exp.icon}
                  </div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    {exp.name}
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {exp.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-mono font-semibold text-[var(--foreground)]">What I Explored: </span>
                  <span className="text-[var(--muted)] leading-relaxed">{exp.explored}</span>
                </div>

                <div className="pt-1">
                  <span className="font-mono font-semibold text-sky-400">Tech: </span>
                  <span className="font-mono text-[11px] text-[var(--muted)]">{exp.tech}</span>
                </div>

                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="font-mono font-semibold text-emerald-400">What I Learned: </span>
                  <span className="text-[var(--muted)] leading-relaxed">{exp.learned}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
