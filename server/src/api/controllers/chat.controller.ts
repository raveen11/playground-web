import type { RequestHandler } from "express";
import type { PoolClient } from "pg";

import pool from "../../infrastructure/database/postgres.js";
import {
  generateQueryEmbedding,
} from "../../infrastructure/ai/embeddings.service.js";

import { openai } from "../../infrastructure/models/openai.client.js";

const LLM_MODEL = process.env.OLLAMA_MODEL || "gpt-4o-mini";

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

    // Generate 1024-dimensional Voyage query embedding
    const questionEmbedding =
      await generateQueryEmbedding(question);

    console.log(
      "Question embedding dimensions:",
      questionEmbedding.length,
    );

    const vector = `[${questionEmbedding.join(",")}]`;

    // Search using embedding_v2 (vector(1024))
    const result = await client.query(
      `
        SELECT
          id,
          document_id,
          content,
          chunk_index,
          embedding_v2 <=> $1::vector AS distance
        FROM document_chunks
        WHERE embedding_v2 IS NOT NULL
        ORDER BY embedding_v2 <=> $1::vector
        LIMIT 5
      `,
      [vector],
    );

    const chunks = result.rows;

    const context = chunks
      .map(
        (chunk, index) =>
          `[Source ${index + 1}]\n${chunk.content}`,
      )
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are a helpful assistant. Use only the provided context to answer the question. If the answer is not contained within the context, say "I don\'t know."',
        },
        {
          role: "user",
          content: `
Context:

${context}

Question:
${question}
          `.trim(),
        },
      ],
    });

    res.json({
      answer:
        response.choices[0]?.message?.content ?? "I don't know.",

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