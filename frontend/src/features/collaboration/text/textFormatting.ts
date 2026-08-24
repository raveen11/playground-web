/**
 * Text Formatting utilities
 * Handles text styling and formatting
 */

export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  isBullet?: boolean;
  textAlign?: "left" | "center" | "right";
  fontSize?: number;
}

export interface FormattedTextNode {
  text: string;
  formatting: TextFormatting;
}

/**
 * Apply formatting to selected text
 */
export function applyFormatting(
  text: string,
  formatting: keyof TextFormatting,
  value?: boolean
): TextFormatting {
  const currentFormatting: TextFormatting = {} as TextFormatting;
  const nextValue = value ?? true;
  (currentFormatting as Record<string, boolean | undefined>)[String(formatting)] = nextValue;
  return currentFormatting;
}

/**
 * Get CSS style string from formatting
 */
export function getFormattingStyle(formatting: TextFormatting): string {
  const styles: string[] = [];

  if (formatting.bold) styles.push("font-weight: bold;");
  if (formatting.italic) styles.push("font-style: italic;");
  if (formatting.underline) styles.push("text-decoration: underline;");
  if (formatting.textAlign) styles.push(`text-align: ${formatting.textAlign};`);
  if (formatting.fontSize) styles.push(`font-size: ${formatting.fontSize}px;`);

  return styles.join(" ");
}

/**
 * Parse markdown-like formatting in text
 */
export function parseFormattedText(
  text: string
): Array<{ text: string; formatting: TextFormatting }> {
  const lines = text.split("\n");
  const result: Array<{ text: string; formatting: TextFormatting }> = [];

  lines.forEach((line, index) => {
    if (index > 0) {
      result.push({ text: "\n", formatting: {} });
    }

    // Check for bullet point
    const bulletMatch = line.match(/^[\s]*[-•*]\s+(.*)$/);
    if (bulletMatch) {
      result.push({
        text: "• " + bulletMatch[1],
        formatting: { isBullet: true },
      });
      return;
    }

    // Simple formatting: **bold** ~italic~ __underline__
    const currentText = line;
    const currentFormatting: TextFormatting = {};

    // Parse bold **text**
    const boldParts = currentText.split(/\*\*(.*?)\*\*/g);
    if (boldParts.length > 1) {
      for (let i = 0; i < boldParts.length; i++) {
        if (i % 2 === 0) {
          result.push({ text: boldParts[i], formatting: currentFormatting });
        } else {
          result.push({
            text: boldParts[i],
            formatting: { ...currentFormatting, bold: true },
          });
        }
      }
    } else {
      result.push({ text: line, formatting: currentFormatting });
    }
  });

  return result;
}
