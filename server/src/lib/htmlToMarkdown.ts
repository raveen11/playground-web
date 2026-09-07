import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

export function htmlToMarkdown(
    html: string,
    url: string
): string {
    const dom = new JSDOM(html, {
        url,
    });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
        throw new Error("Could not extract readable content");
    }

    const turndown = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
    });

    const markdown = turndown.turndown(article.content || "");

    return `# ${article.title}\n\n${markdown}`;
}