// src/services/embeddings.ts

import ollama from "ollama";

const EMBEDDING_MODEL = "nomic-embed-text";

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  if (!text.trim()) {
    throw new Error("Text cannot be empty");
  }

  const response = await ollama.embed({
    model: EMBEDDING_MODEL,
    input: text,
  });

  const embedding = response.embeddings?.[0];

  if (!embedding) {
    throw new Error("Failed to generate embedding");
  }

  return embedding;
}

export async function createEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

  const response = await ollama.embed({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.embeddings;
}