import { Ollama } from "ollama";

export const ollamaClient = new Ollama({
  host: process.env.OLLAMA_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
  },
});