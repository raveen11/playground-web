import type { RequestHandler } from "express";
import { prisma } from "../../lib/prisma.js";
import { chunkText } from "../../modules/documents/document-chunker.js";
import { createEmbeddings } from "../../infrastructure/ai/embeddings.service.js";

export const getDocuments: RequestHandler = async (_req, res) => {
  try {
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        fileType: true,
        fileSize: true,
        filePath: true,
        createdAt: true,
        content: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(
      documents.map((document) => ({
        ...document,
        fileSize: document.fileSize?.toString() ?? null,
      })),
    );
  } catch (error) {
    console.error("Failed to fetch documents:", error);

    res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
};

export const uploadDocument: RequestHandler = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        message: "File is required",
      });
      return;
    }

    // --------------------------------------------------
    // 1. Extract content
    // --------------------------------------------------

    const content = file.buffer.toString("utf-8");

    if (!content.trim()) {
      res.status(400).json({
        message: "File is empty",
      });
      return;
    }

    // --------------------------------------------------
    // 2. Split content into chunks
    // --------------------------------------------------

    const chunks = chunkText(content);

    if (chunks.length === 0) {
      res.status(400).json({
        message: "No content could be extracted from the file",
      });
      return;
    }

    // --------------------------------------------------
    // 3. Generate embeddings
    // IMPORTANT:
    // Do this BEFORE the database transaction.
    // --------------------------------------------------

    const embeddings = await createEmbeddings(chunks);

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
      );
    }

    // --------------------------------------------------
    // 4. Create document
    // --------------------------------------------------

    const document = await prisma.document.create({
      data: {
        name: file.originalname,
        fileType: file.mimetype,
        fileSize: BigInt(file.size),
        content,
        fileData: new Uint8Array(file.buffer),
      },
    });

    try {
      // ------------------------------------------------
      // 5. Create all chunks
      // ------------------------------------------------

      const chunkRecords = await prisma.documentChunk.createManyAndReturn({
        data: chunks.map((chunk, index) => ({
          documentId: document.id,
          content: chunk,
          chunkIndex: index,
        })),
        select: {
          id: true,
          chunkIndex: true,
        },
      });

      // ------------------------------------------------
      // 6. Save embeddings
      //
      // embeddingV2 is Unsupported("vector"), so Prisma
      // cannot write it normally.
      // ------------------------------------------------

      for (const chunkRecord of chunkRecords) {
        const embedding = embeddings[chunkRecord.chunkIndex];

        if (!embedding) {
          throw new Error(
            `Missing embedding for chunk ${chunkRecord.chunkIndex}`,
          );
        }

        const vector = `[${embedding.join(",")}]`;

        await prisma.$executeRaw`
          UPDATE "document_chunks"
          SET "embedding_v2" = ${vector}::vector
          WHERE "id" = ${chunkRecord.id}
        `;
      }
    } catch (error) {
      // -----------------------------------------------
      // If chunk/embedding saving fails, remove the
      // document that was already created.
      // -----------------------------------------------

      await prisma.document.delete({
        where: {
          id: document.id,
        },
      });

      throw error;
    }

    // --------------------------------------------------
    // 7. Response
    // --------------------------------------------------

    res.status(201).json({
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        name: document.name,
        fileType: document.fileType,
        fileSize: document.fileSize?.toString(),
        chunks: chunks.length,
      },
    });
  } catch (error) {
    console.error("Upload document error:", error);

    res.status(500).json({
      message: "Failed to upload document",
    });
  }
};