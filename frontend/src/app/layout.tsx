import type { Metadata } from "next";
import { Geist, Geist_Mono, Literata } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/components/WebSocketProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raveen Neupane — Frontend / Full-Stack Engineer",
  description:
    "Personal portfolio and interactive engineering playground of Raveen Neupane. Specializing in React, Next.js, TypeScript, Node.js, realtime systems, and AI/RAG architectures.",
  keywords: [
    "Raveen Neupane",
    "Frontend Engineer",
    "Full-Stack Engineer",
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "WebSockets",
    "Realtime Systems",
    "RAG",
    "PostgreSQL",
    "Prisma",
  ],
  authors: [{ name: "Raveen Neupane" }],
  openGraph: {
    title: "Raveen Neupane — Frontend / Full-Stack Engineer",
    description:
      "Personal portfolio and interactive engineering playground exploring realtime collaboration, code editing, and AI/RAG architectures.",
    type: "website",
    locale: "en_US",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${literata.variable} antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen`}
      >
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  );
}
