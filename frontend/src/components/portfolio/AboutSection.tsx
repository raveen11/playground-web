import { IconCode, IconZap, IconServer, IconSparkles } from "./Icons";

export default function AboutSection() {
  const highlights = [
    {
      icon: <IconCode className="w-4 h-4 text-sky-400" />,
      title: "Frontend Architecture",
      desc: "Architecting performant React and Next.js applications with clean state management, modular component systems, and strong TypeScript types.",
    },
    {
      icon: <IconZap className="w-4 h-4 text-amber-400" />,
      title: "Realtime & Multiplayer",
      desc: "Building low-latency WebSocket protocols, state synchronization engines, presence awareness, and collaborative canvases.",
    },
    {
      icon: <IconServer className="w-4 h-4 text-emerald-400" />,
      title: "Full-Stack & Systems",
      desc: "Engineering Node.js backends, PostgreSQL data models with Prisma, RESTful APIs, and distributed database synchronization.",
    },
    {
      icon: <IconSparkles className="w-4 h-4 text-purple-400" />,
      title: "AI Workflows & RAG",
      desc: "Integrating LLM embeddings, vector search, document ingestion, and context retrieval pipelines into practical developer tools.",
    },
  ];

  return (
    <section id="about" className="py-20 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Section Header & Summary */}
          <div className="lg:col-span-4 space-y-4">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
              <span>01.</span>
              <span>Overview</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              About Me
            </h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Engineering web experiences that balance interface precision with reliable backend systems.
            </p>
          </div>

          {/* Body Narrative & Focus Cards */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4 text-base text-[var(--muted)] leading-relaxed">
              <p>
                I am a Frontend and Full-Stack Engineer with deep experience building scalable, interactive
                web applications. As a Software Engineer and Frontend Team Lead at Treeleaf Technologies,
                I have spent the past several years leading frontend architectures, designing design systems,
                and deploying mission-critical platforms in production.
              </p>
              <p>
                My core expertise is rooted in <strong className="text-[var(--foreground)] font-medium">React, Next.js, and TypeScript</strong>,
                with a continuous drive toward deeper backend systems, distributed architectures, and developer tooling.
                I enjoy tackling hard engineering challenges like multiplayer state synchronization, collaborative canvas rendering,
                and realtime communication over WebSockets.
              </p>
              <p>
                Currently, I am exploring the intersection of modern full-stack web engineering, <strong className="text-[var(--foreground)] font-medium">AI/RAG retrieval pipelines</strong>,
                and high-throughput backend services in Node.js and PostgreSQL.
              </p>
            </div>

            {/* Core Capability Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-dark)] transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-[var(--code-bg)] border border-[var(--border)]">
                      {item.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3>
                  </div>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
