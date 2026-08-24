"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/config";

export default function UploadFile() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Please select a file");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    try {
      setUploading(true);
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/documents`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      console.log("Uploaded document:", data);

      setMessage("File uploaded successfully");
      setFile(null);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-6 text-2xl font-bold">
        Upload Document
      </h1>

      <div className="rounded-lg border p-6">
        <input
          type="file"
          accept=".txt,.md"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
          }}
        />

        {file && (
          <p className="mt-4 text-sm">
            Selected: {file.name}
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {message && (
          <p className="mt-4 text-sm">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}