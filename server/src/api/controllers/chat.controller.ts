import type { RequestHandler } from "express";
import { createEmbeddings } from "../../infrastructure/ai/embeddings.service.js";
import type { PoolClient } from "pg";
import pool from "../../infrastructure/database/postgres.js";
import { ollamaClient } from "../../infrastructure/models/ollama.client.js";

const LLM_MODEL = process.env.OLLAMA_MODEL!;

export const chatWithDocuments: RequestHandler = async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    res.status(400).json({
      message: "Question is required",
    });
    return;
  }

  let client: PoolClient | undefined;

  try {
    client = await pool.connect();

    // 1. Embed user question
    const [questionEmbedding] = await createEmbeddings([question]);

    // 2. Search similar document chunks
    const result = await client.query(
      `
      SELECT
        id,
        document_id,
        content,
        chunk_index,
        embedding <=> $1::vector AS distance
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT 5
      `,
      [`[${questionEmbedding.join(",")}]`],
    );

    const chunks = result.rows;

    // 3. Build context
    const context = chunks
      .map(
        (chunk, index) =>
          `[Source ${index + 1}]\n${chunk.content}`,
      )
      .join("\n\n");

    // 4. Send context + question to office LLM
    const response = await ollamaClient.chat({
      model: LLM_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful document assistant. " +
            "Answer using only the provided context. " +
            'If the answer cannot be found, say: "I don\'t know based on the provided documents." ' +
            "Do not make up information.",
        },
        {
          role: "user",
          content: `
Context:

${context}

Question:

${question}
          `,
        },
      ],
    });

    // 5. Return answer + sources
    res.json({
      answer: response.message.content,

      sources: chunks.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.document_id,
        chunkIndex: chunk.chunk_index,
        content: chunk.content,
        distance: Number(chunk.distance),
      })),
    });
  } catch (error) {
    console.error("Chat API error:", error);

    res.status(500).json({
      message: "Failed to process chat request",
    });
  } finally {
    client?.release();
  }
};