import express, { type Express } from "express";
import pool from "./config/database.js";

import cors from "cors";
import multer from "multer";
import { chunkText } from "./utils/helper.js";
import { createEmbeddings } from "./config/embeding.js";
import ollama from "ollama";

const LLM_MODEL = "llama3.2";
const app: Express = express();

app.use(
  cors({
    origin: "http://localhost:3003",
  })
);

app.use(express.json());


app.get("/api/documents", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM documents
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch documents:", error);

    res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
});

app.post(
  "/api/documents",
  upload.single("file"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      const file = req.file;

      let content = "";

      // Markdown / text
      if (
        file.mimetype === "text/plain" ||
        file.mimetype === "text/markdown" ||
        file.originalname.endsWith(".md")
      ) {
        content = file.buffer.toString("utf-8");
      }

      // PDF
      else if (file.mimetype === "application/pdf") {
        // TODO: PDF extraction
        content = "";
      }

      else {
        return res.status(400).json({
          message: "Only PDF and MD files are supported",
        });
      }

      if (!content.trim()) {
        return res.status(400).json({
          message: "No text could be extracted",
        });
      }

      await client.query("BEGIN");

      // Create document
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
        RETURNING id, name, file_size, file_type, created_at
        `,
        [
          file.originalname,
          content,
          file.size,
          file.mimetype,
          file.buffer,
        ]
      );

      const document = documentResult.rows[0];

      // Chunk
      const chunks = chunkText(content);

      console.log(
        `Created ${chunks.length} chunks`
      );

      // Generate embeddings
      const embeddings = await createEmbeddings(chunks);

      // Insert chunks
      for (let index = 0; index < chunks.length; index++) {
        await client.query(
          `
          INSERT INTO document_chunks (
            document_id,
            chunk_index,
            content,
            embedding
          )
          VALUES ($1, $2, $3, $4)
          `,
          [
            document.id,
            index,
            chunks[index],
            `[${embeddings[index].join(",")}]`,
          ]
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        ...document,
        chunks: chunks.length,
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "Upload failed:",
        error
      );

      return res.status(500).json({
        message: "Failed to upload document",
      });

    } finally {
      client.release();
    }
  }
);


app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;
    const client = await pool.connect();
    if (!question || typeof question !== "string") {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    // --------------------------------
    // 1. Generate embedding
    // --------------------------------

    const questionEmbedding =
      await createEmbeddings([question]);

    // --------------------------------
    // 2. Search similar chunks
    // --------------------------------
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
      [
        `[${questionEmbedding[0].join(",")}]`
      ]
    );

    const chunks = result.rows;

    // --------------------------------
    // 3. Build context for LLM
    // --------------------------------

    const context = chunks
      .map(
        (chunk, index) =>
          `[Source ${index + 1}]\n${chunk.content}`
      )
      .join("\n\n");
      console.log("Context for LLM:", context);
    // --------------------------------
    // 4. Ask LLM
    // --------------------------------

    const response = await ollama.chat({
      model: LLM_MODEL,
      messages: [
        {
          role: "system",
          content: `
            You are a helpful document assistant.

            Answer the user's question using ONLY the
            provided context.

            If the answer cannot be found in the context,
            say:

            "I don't know based on the provided documents."

            Do not make up information.
                      `.trim(),
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

    // --------------------------------
    // 5. Return answer + sources
    // --------------------------------

    return res.json({
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

    return res.status(500).json({
      message: "Failed to process chat request",
    });
  }
});

export { app };