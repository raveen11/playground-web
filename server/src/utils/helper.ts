export function chunkText(
  text: string,
  chunkSize = 3000,
  overlap = 300
): string[] {
  if (!text.trim()) {
    return [];
  }

  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error(
      "overlap must be less than chunkSize"
    );
  }

  const chunks: string[] = [];
  const step = chunkSize - overlap;

  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + chunkSize);

    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}