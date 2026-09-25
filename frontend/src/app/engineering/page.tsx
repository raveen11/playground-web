import Link from "next/link";
import Navbar from "@/components/portfolio/Navbar";
import Footer from "@/components/portfolio/Footer";
import EngineeringSection from "@/components/portfolio/EngineeringSection";
import EngineeringLabs from "@/components/portfolio/EngineeringLabs";
import { IconZap } from "@/components/portfolio/Icons";

export const metadata = {
  title: "Engineering & Architecture — Raveen Neupane",
  description:
    "In-depth technical architecture, realtime WebSocket multiplexing protocols, and full-stack systems engineering by Raveen Neupane.",
};

export default function EngineeringPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          {/* Header */}
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 uppercase tracking-wider">
              <span>Technical Documentation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
              Engineering Architecture & Systems Design
            </h1>
            <p className="text-base text-[var(--muted)] leading-relaxed">
              A comprehensive breakdown of how Playground Web multiplexes real-time data, manages
              multi-tenant relational schemas, and executes RAG vector retrieval pipelines.
            </p>
          </div>

          {/* Architecture Visualizer & Principles */}
          <EngineeringSection />

          {/* Labs */}
          <EngineeringLabs />

          {/* Call to action */}
          <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Ready to test the architecture live?
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Launch the collaborative workspace and observe WebSocket multiplexing in real time.
              </p>
            </div>

            <Link
              href="/playground"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-xs transition-colors shrink-0"
            >
              <IconZap className="w-4 h-4" />
              <span>Launch Playground Workspace</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
