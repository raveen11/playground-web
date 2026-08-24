export async function processDocument(file: File) {
  // 1. Extract text
  const text = await extractText(file);

  // 2. Create chunks
  const chunks = chunkText(text);

  // 3. Create document
  const document = await createDocument(file);

  // 4. Create embeddings
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await createEmbedding(chunks[i]);

    // 5. Save chunk + embedding
    await saveChunk({
      documentId: document.id,
      content: chunks[i],
      chunkIndex: i,
      embedding,
    });
  }

  return document;
}