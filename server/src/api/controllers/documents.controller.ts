import type { RequestHandler } from "express";
import type { PoolClient } from "pg";

import pool from "../../infrastructure/database/postgres.js";
import { createEmbeddings } from "../../infrastructure/ai/embeddings.service.js";
import { chunkText } from "../../modules/documents/document-chunker.js";

export const getDocuments: RequestHandler = async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM documents");

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch documents:", error);

    res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
};

export const uploadDocument: RequestHandler = async (req, res) => {
  if (!req.file) {
    res.status(400).json({
      message: "No file uploaded",
    });
    return;
  }

  const { file } = req;

  const isTextFile =
    file.mimetype === "text/plain" ||
    file.mimetype === "text/markdown" ||
    file.originalname.endsWith(".md");

  if (!isTextFile && file.mimetype !== "application/pdf") {
    res.status(400).json({
      message: "Only PDF and MD files are supported",
    });
    return;
  }

  // PDF extraction is not implemented yet.
  const content = isTextFile
    ? file.buffer.toString("utf-8")
    : "";

  if (!content.trim()) {
    res.status(400).json({
      message: "No text could be extracted",
    });
    return;
  }

  let client: PoolClient | undefined;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    // 1. Save document
    const documentResult = await client.query(
      `
        INSERT INTO documents (
          name,
          content,
          file_size,
          file_type,
          file_data
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          name,
          file_size,
          file_type,
          created_at
      `,
      [
        file.originalname,
        content,
        file.size,
        file.mimetype,
        file.buffer,
      ],
    );

    const document = documentResult.rows[0];

    // 2. Split document into chunks
    const chunks = chunkText(content);

    if (!chunks.length) {
      throw new Error("Document produced no chunks");
    }

    // 3. Generate Voyage embeddings
    // createEmbeddings() should use:
    // input_type: "document"
    // output_dimension: 1024
    const embeddings = await createEmbeddings(chunks);

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch. Chunks: ${chunks.length}, Embeddings: ${embeddings.length}`,
      );
    }

    // 4. Store chunks + Voyage embeddings
    for (const [index, chunk] of chunks.entries()) {
      const embedding = embeddings[index];

      await client.query(
        `
          INSERT INTO document_chunks (
            document_id,
            chunk_index,
            content,
            embedding_v2
          )
          VALUES ($1, $2, $3, $4::vector)
        `,
        [
          document.id,
          index,
          chunk,
          `[${embedding.join(",")}]`,
        ],
      );
    }

    // 5. Commit everything
    await client.query("COMMIT");

    res.status(201).json({
      ...document,
      chunks: chunks.length,
      embeddingModel: "voyage-4-lite",
      embeddingDimensions: 1024,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Document upload failed:", error);

    res.status(500).json({
      message: "Failed to upload document",
    });
  } finally {
    client?.release();
  }
};