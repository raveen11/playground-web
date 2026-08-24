"use client";

import UploadFile from "@/components/document/UploadFile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import ChatPage from "@/components/document/ChatPage";

type Document = {
  id: number;
  name: string;
  file_type: string;
  file_data: Buffer;
  created_at: string;
  content: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch("https://playground-web-i74t.onrender.com/api/documents");

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
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Documents</h1>

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
                  {new Date(document.created_at).toLocaleString()}
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
  );
}
