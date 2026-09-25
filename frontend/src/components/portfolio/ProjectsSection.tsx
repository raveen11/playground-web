import Link from "next/link";
import {
  IconCode,
  IconSparkles,
  IconNetwork,
  IconShield,
  IconArrowUpRight,
  IconGithub,
  IconFolder,
} from "./Icons";

export default function ProjectsSection() {
  const projects = [
    {
      title: "Collaborative Code Canvas",
      description:
        "Infinite node-based canvas powered by React Flow and embedded Monaco code editors. Enables multi-user simultaneous code writing, language syntax switching, and folder structure import.",
      tags: ["React Flow", "Monaco Editor", "WebSockets", "AST Tree"],
      link: "/whiteboard",
      github: "https://github.com/raveen11/playground-web",
      icon: <IconCode className="w-4 h-4 text-emerald-400" />,
      highlight: "Infinite Canvas + Monaco Nodes",
    },
    {
      title: "RAG Document Intelligence",
      description:
        "Retrieval-Augmented Generation engine for developer documentation. Ingests Markdown files, computes vector embeddings, and enables conversational AI question answering with context grounding.",
      tags: ["OpenAI API", "Vector Embeddings", "PostgreSQL", "Markdown GFM"],
      link: "/document",
      github: "https://github.com/raveen11/playground-web",
      icon: <IconSparkles className="w-4 h-4 text-purple-400" />,
      highlight: "Vector Search & Retrieval",
    },
    {
      title: "WebSocket Multiplexer & Room Router",
      description:
        "Custom WebSocket backend gateway that multiplexes multiple feature streams (Kanban sync, presence, live chat, shared paper doc) over a single persistent TCP connection per client.",
      tags: ["Node.js", "WebSockets", "Zod Validation", "Event Emitters"],
      link: "/playground",
      github: "https://github.com/raveen11/playground-web",
      icon: <IconNetwork className="w-4 h-4 text-sky-400" />,
      highlight: "Single-Pipe Multi-Room Routing",
    },
    {
      title: "Multi-Tenant Auth & Role Engine",
      description:
        "Enterprise access management with company scoping, HTTP-only secure cookie sessions, user invite verification tokens, and role-based permissions (Super Admin, Company Admin, Editor, Viewer).",
      tags: ["Express", "Prisma ORM", "PostgreSQL", "JWT & Cookies"],
      link: "/company/users",
      github: "https://github.com/raveen11/playground-web",
      icon: <IconShield className="w-4 h-4 text-amber-400" />,
      highlight: "Role-Based Access Control",
    },
    {
      title: "Local Project Folder Importer",
      description:
        "Client-side file system directory parsing engine using the File System Access API to convert raw local folder trees into interactive visual node networks.",
      tags: ["TypeScript", "File System API", "Recursive AST", "Tree View"],
      link: "/random",
      github: "https://github.com/raveen11/playground-web",
      icon: <IconFolder className="w-4 h-4 text-rose-400" />,
      highlight: "Directory to Node Graph",
    },
    {
      title: "Interactive Game & Canvas Lab",
      description:
        "2D physics canvas simulation exploring game loop cycles, coordinate transformations, collision detection, and responsive viewport scaling.",
      tags: ["HTML5 Canvas", "Game Loop", "Physics Math", "TypeScript"],
      link: "/game",
      github: "https://github.com/raveen11/playground-web",
      icon: <IconCode className="w-4 h-4 text-cyan-400" />,
      highlight: "2D Canvas Simulation",
    },
  ];

  return (
    <section id="projects" className="py-20 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
              <span>04.</span>
              <span>Engineering Case Studies</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Projects & Systems
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-xl leading-relaxed">
              Focused engineering projects exploring realtime protocols, developer interfaces, and distributed systems.
            </p>
          </div>

          <a
            href="https://github.com/raveen11"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <span>View all on GitHub</span>
            <IconArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.title}
              className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:border-[var(--muted-dark)] hover:bg-[var(--card-hover)] transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[var(--code-bg)] border border-[var(--border)]">
                    {project.icon}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--code-bg)] border border-[var(--border)] text-sky-400">
                    {project.highlight}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-sky-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {/* Tech tags */}
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] font-mono border border-[var(--border)] bg-[var(--code-bg)] text-[var(--muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
                  <Link
                    href={project.link}
                    className="inline-flex items-center gap-1 text-sky-400 hover:underline font-medium"
                  >
                    <span>Launch App</span>
                    <IconArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <IconGithub className="w-3.5 h-3.5" />
                    <span>Source</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
