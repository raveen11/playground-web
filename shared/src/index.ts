export * from "./whiteboard.types.js";
export * from "./operations.types.js";
export * from "./schemas.js";

export const PRESENCE_COLORS = [
  "#E63946",
  "#457B9D",
  "#2A9D8F",
  "#E9C46A",
  "#F4A261",
  "#9B5DE5",
  "#00BBF9",
  "#00F5D4",
] as const;

export function pickColor(index: number): string {
  return PRESENCE_COLORS[index % PRESENCE_COLORS.length];
}
