"use client";

import { useState } from "react";
import {
  IconMail,
  IconGithub,
  IconLinkedin,
  IconArrowUpRight,
  IconCheck,
} from "./Icons";

export default function ContactSection() {
  const [copied, setCopied] = useState(false);
  const email = "raveen.neupane11@gmail.com";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="contact" className="py-24 border-t border-[var(--border)] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
            <span>09.</span>
            <span>Get In Touch</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
            Let&apos;s build something.
          </h2>

          <p className="text-base text-[var(--muted)] leading-relaxed">
            I am always open to interesting engineering opportunities, frontend architecture roles,
            distributed system discussions, and collaborative projects.
          </p>

          {/* Direct Email Action Card */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`mailto:${email}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-sm transition-colors shadow-lg"
            >
              <IconMail className="w-4 h-4" />
              <span>Send Message ({email})</span>
            </a>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)] text-xs font-mono text-[var(--foreground)] transition-colors"
            >
              {copied ? (
                <>
                  <IconCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Email Copied!</span>
                </>
              ) : (
                <>
                  <span>Copy Address</span>
                </>
              )}
            </button>
          </div>

          {/* Social Links List */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-sm font-mono">
            <a
              href="https://github.com/raveen11"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <IconGithub className="w-4 h-4" />
              <span>GitHub</span>
              <IconArrowUpRight className="w-3 h-3" />
            </a>

            <a
              href="https://linkedin.com/in/raveen-neupane"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <IconLinkedin className="w-4 h-4" />
              <span>LinkedIn</span>
              <IconArrowUpRight className="w-3 h-3" />
            </a>

            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <IconMail className="w-4 h-4" />
              <span>Email</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
