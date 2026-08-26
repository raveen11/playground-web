import type { RequestHandler } from "express";
import ollama from "ollama";
import { createEmbeddings } from "../../infrastructure/ai/embeddings.service.js";
import type { PoolClient } from "pg";
import pool from "../../infrastructure/database/postgres.js";
import { openai } from "../../infrastructure/models/openai.client.js";

const LLM_MODEL = process.env.OLLAMA_MODEL || "gpt-4o-mini";

export const chatWithDocuments: RequestHandler = async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== "string") {
    res.status(400).json({ message: "Question is required" });
    return;
  }

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const [questionEmbedding] = await createEmbeddings([question]);
    const result = await client.query(
      `SELECT id, document_id, content, chunk_index, embedding <=> $1::vector AS distance
       FROM document_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [`[${questionEmbedding.join(",")}]`],
    );
    const chunks = result.rows;
    const context = chunks
      .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: "user",
          content:
            `You are a helpful assistant. Use the following context to answer the question.\n\nContext:\n${context}\n\nQuestion: ${question}.If the answer is not contained within the context, say "I don't know."`,
        },
      ],
    });

    res.json({
      answer: response.choices[0].message.content,
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
    res.status(500).json({ message: "Failed to process chat request" });
  } finally {
    client?.release();
  }
};
