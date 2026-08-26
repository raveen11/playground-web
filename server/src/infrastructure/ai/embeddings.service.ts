const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

const VOYAGE_MODEL =
  process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-4-lite";

type VoyageEmbeddingResponse = {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
};

async function voyageEmbed(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: inputType,
      output_dimension: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Voyage embedding failed (${response.status}): ${error}`
    );
  }

  const data =
    (await response.json()) as VoyageEmbeddingResponse;

  return data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  if (!text.trim()) {
    throw new Error("Text cannot be empty");
  }

  const embeddings = await voyageEmbed(
    [text],
    "document"
  );

  return embeddings[0];
}

export async function createEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const validTexts = texts.filter((text) => text.trim());

  if (!validTexts.length) {
    return [];
  }

  return voyageEmbed(validTexts, "document");
}

export async function generateQueryEmbedding(
  query: string
): Promise<number[]> {
  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }

  const embeddings = await voyageEmbed(
    [query],
    "query"
  );

  return embeddings[0];
}