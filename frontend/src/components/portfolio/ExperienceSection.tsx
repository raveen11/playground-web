import { IconCheck } from "./Icons";

export default function ExperienceSection() {
  const experiences = [
    {
      period: "2021 — Present",
      role: "Software Engineer / Frontend Team Lead",
      company: "Treeleaf Technologies",
      type: "Full-Time",
      description:
        "Leading frontend architecture and multi-disciplinary teams to design, engineer, and deploy high-performance web applications, collaborative interfaces, and scalable enterprise products.",
      achievements: [
        "Architected and standardized enterprise React & Next.js codebases, improving frontend performance, accessibility, and bundle efficiency across core product lines.",
        "Engineered realtime collaboration tools, live dashboards, and workflow automation systems with WebSocket event handling and responsive state management.",
        "Built extensible UI component libraries and design tokens, accelerating feature delivery and design consistency across multiple engineering squads.",
        "Led team code reviews, mentored frontend developers, established strict TypeScript guidelines, and integrated automated linting and CI/CD pipelines.",
        "Collaborated closely with product managers, UI/UX designers, and backend teams to deliver scalable e-commerce platforms and operational tooling.",
      ],
      technologies: [
        "React",
        "Next.js",
        "TypeScript",
        "Node.js",
        "WebSockets",
        "Tailwind CSS",
        "REST APIs",
        "Team Leadership",
      ],
    },
  ];

  return (
    <section id="work" className="py-20 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Section Heading */}
          <div className="lg:col-span-4 space-y-4">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
              <span>02.</span>
              <span>Experience</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Work History
            </h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Professional track record leading frontend teams and shipping enterprise software.
            </p>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-8">
            <div className="space-y-12 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[var(--border)]">
              {experiences.map((item, index) => (
                <div key={index} className="relative pl-10">
                  {/* Timeline node marker */}
                  <div className="absolute left-1.5 top-1.5 w-5 h-5 rounded-full border-2 border-sky-400 bg-[var(--background)] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 hover:border-[var(--muted-dark)] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--foreground)]">
                          {item.role}
                        </h3>
                        <div className="text-sm font-medium text-sky-400 font-mono">
                          {item.company}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-[var(--border)] bg-[var(--code-bg)] text-[var(--muted)]">
                          {item.period}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                      {item.description}
                    </p>

                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--muted-dark)]">
                        Key Responsibilities & Impact
                      </div>
                      <ul className="space-y-2">
                        {item.achievements.map((ach, i) => (
                          <li key={i} className="text-xs text-[var(--muted)] flex items-start gap-2.5">
                            <span className="mt-1 text-sky-400 shrink-0">
                              <IconCheck className="w-3.5 h-3.5" />
                            </span>
                            <span className="leading-relaxed">{ach}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tech tags */}
                    <div className="pt-4 border-t border-[var(--border)] flex flex-wrap gap-1.5">
                      {item.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded text-[11px] font-mono border border-[var(--border)] bg-[var(--code-bg)] text-[var(--muted)]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
