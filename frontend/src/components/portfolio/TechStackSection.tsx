export default function TechStackSection() {
  const stackCategories = [
    {
      category: "Frontend & UI",
      description: "Building reactive, accessible, and high-performance interfaces",
      items: [
        { name: "React 19", level: "Core" },
        { name: "Next.js 15", level: "Core" },
        { name: "TypeScript", level: "Core" },
        { name: "Tailwind CSS", level: "Core" },
        { name: "React Flow", level: "Canvas" },
        { name: "Monaco Editor", level: "Editor" },
      ],
    },
    {
      category: "Backend & Realtime",
      description: "Constructing robust server routers, APIs, and event multiplexers",
      items: [
        { name: "Node.js", level: "Core" },
        { name: "Express", level: "Core" },
        { name: "WebSockets (ws)", level: "Core" },
        { name: "REST APIs", level: "Core" },
        { name: "Zod Schema Validation", level: "Core" },
        { name: "HTTP Cookie Auth", level: "Security" },
      ],
    },
    {
      category: "Database & Storage",
      description: "Data modeling, schema migrations, and client-side persistence",
      items: [
        { name: "PostgreSQL", level: "Relational" },
        { name: "Prisma ORM", level: "Query/Migrations" },
        { name: "Supabase", level: "Cloud Postgres" },
        { name: "IndexedDB", level: "Browser Storage" },
      ],
    },
    {
      category: "AI & Vector Search",
      description: "Grounding LLMs with real developer documentation & context",
      items: [
        { name: "OpenAI API", level: "LLM" },
        { name: "Vector Embeddings", level: "Search" },
        { name: "RAG Ingestion Pipelines", level: "Context" },
        { name: "Markdown Parsing (GFM)", level: "Parser" },
      ],
    },
    {
      category: "Tooling & Infrastructure",
      description: "Monorepo management, automated linting, and development workflows",
      items: [
        { name: "pnpm Workspaces", level: "Monorepo" },
        { name: "Git & GitHub", level: "VCS" },
        { name: "GitHub Actions", level: "CI/CD" },
        { name: "Docker", level: "Containers" },
        { name: "ESLint & Prettier", level: "Quality" },
      ],
    },
  ];

  return (
    <section id="tech-stack" className="py-20 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
            <span>08.</span>
            <span>Technologies & Tools</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Technical Stack
          </h2>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Technologies, libraries, and protocols I use to build scalable, type-safe full-stack software.
          </p>
        </div>

        {/* Stack Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stackCategories.map((cat) => (
            <div
              key={cat.category}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 hover:border-[var(--muted-dark)] transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--foreground)] font-mono">
                  {cat.category}
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                {cat.items.map((tech) => (
                  <div
                    key={tech.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--code-bg)] text-xs font-mono"
                  >
                    <span className="text-[var(--foreground)] font-medium">{tech.name}</span>
                    <span className="text-[10px] text-[var(--muted-dark)]">• {tech.level}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
