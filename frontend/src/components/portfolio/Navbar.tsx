"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconGithub,
  IconLinkedin,
  IconFileText,
  IconMenu,
  IconX,
  IconSun,
  IconMoon,
  IconArrowUpRight,
} from "./Icons";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    if (next) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
      document.documentElement.classList.add("dark");
    }
  };

  const navLinks = [
    { label: "About", href: "/#about" },
    { label: "Work", href: "/#work" },
    { label: "Engineering", href: "/#engineering" },
    { label: "Playground", href: "/#playground" },
    { label: "Contact", href: "/#contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--border)] py-3 shadow-sm"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Brand / Name */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[var(--foreground)] hover:opacity-90 transition-opacity"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-xs text-[var(--muted-dark)] hidden sm:inline">~/</span>
          <span>Raveen Neupane</span>
          <span className="hidden md:inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]">
            Frontend / Full-Stack
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-[var(--muted)] bg-[var(--card)]/60 px-3 py-1.5 rounded-full border border-[var(--border)]">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3 py-1 rounded-full hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions & Social Links */}
        <div className="hidden sm:flex items-center gap-2.5">
          <a
            href="https://github.com/raveen11"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border border-transparent hover:border-[var(--border)] transition-all"
            aria-label="GitHub Profile"
            title="GitHub"
          >
            <IconGithub className="w-4 h-4" />
          </a>
          <a
            href="https://linkedin.com/in/raveen-neupane"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border border-transparent hover:border-[var(--border)] transition-all"
            aria-label="LinkedIn Profile"
            title="LinkedIn"
          >
            <IconLinkedin className="w-4 h-4" />
          </a>
          <Link
            href="/#contact"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
          >
            <IconFileText className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>Resume</span>
            <IconArrowUpRight className="w-3 h-3 text-[var(--muted)]" />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border border-[var(--border)] transition-all"
            aria-label="Toggle Theme"
          >
            {isLightMode ? <IconMoon className="w-4 h-4" /> : <IconSun className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Hamburger & Theme */}
        <div className="flex sm:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Toggle Theme"
          >
            {isLightMode ? <IconMoon className="w-4 h-4" /> : <IconSun className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-3 shadow-xl">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/raveen11"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1"
              >
                <IconGithub className="w-4 h-4" /> GitHub
              </a>
              <a
                href="https://linkedin.com/in/raveen-neupane"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1"
              >
                <IconLinkedin className="w-4 h-4" /> LinkedIn
              </a>
            </div>
            <Link
              href="/playground"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-medium text-xs hover:bg-sky-400 transition-colors"
            >
              Open Playground
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
