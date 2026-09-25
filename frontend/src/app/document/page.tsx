"use client";

import Link from "next/link";
import UploadFile from "@/components/document/UploadFile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import ChatPage from "@/components/document/ChatPage";
import { API_BASE_URL } from "@/lib/config";

type Document = {
  id: number;
  name: string;
  fileType: string;
  fileData: Buffer;
  createdAt: string;
  content: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch(`${API_BASE_URL}/documents`);

        if (!response.ok) {
          throw new Error("Failed to fetch documents");
        }

        const data = await response.json();

        setDocuments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading document RAG workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
            >
              <span>←</span>
              <span>Back to Portfolio</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">RAG Document Intelligence</h1>
            <p className="text-xs text-slate-500">
              Upload documents, vectorize content, and perform conversational AI search.
            </p>
          </div>

          <Link
            href="/playground"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Open Kanban →
          </Link>
        </div>

        <UploadFile />

        <ChatPage documents={documents} />

      <div className="mt-6 space-y-4">
        {documents.map((document) => (
          <details
            key={document.id}
            className="group rounded-lg border bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold">
              <div>
                <h2>{document.name}</h2>

                <p className="mt-1 text-sm font-normal text-gray-500">
                  {new Date(document.createdAt).toLocaleString()}
                </p>
              </div>

              <span className="transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>

            <div className="border-t p-5">
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {document.content}
                </ReactMarkdown>
              </div>
            </div>
          </details>
        ))}
      </div>
      </div>
    </div>
  );
}
