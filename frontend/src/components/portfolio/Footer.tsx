import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)]/40 py-12 text-xs text-[var(--muted)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="font-semibold text-[var(--foreground)] tracking-tight">
            Raveen Neupane
          </div>
          <div className="font-mono text-[11px] text-[var(--muted-dark)]">
            Frontend / Full-Stack Engineer • Treeleaf Technologies
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-[11px]">
          <Link href="/playground" className="hover:text-[var(--foreground)] transition-colors">
            Playground
          </Link>
          <Link href="/whiteboard" className="hover:text-[var(--foreground)] transition-colors">
            Canvas
          </Link>
          <Link href="/document" className="hover:text-[var(--foreground)] transition-colors">
            RAG Docs
          </Link>
          <a
            href="https://github.com/raveen11"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/raveen-neupane"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            LinkedIn
          </a>
        </div>

        <div className="font-mono text-[11px] text-[var(--muted-dark)]">
          © {currentYear} Raveen Neupane
        </div>
      </div>
    </footer>
  );
}
