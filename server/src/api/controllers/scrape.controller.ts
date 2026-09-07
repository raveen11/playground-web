import type { RequestHandler } from "express";

import { scrapeUrl } from "../../lib/scrapeUrl.js";
import { htmlToMarkdown } from "../../lib/htmlToMarkdown.js";

export const scrape: RequestHandler = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                message: "URL is required",
            });
        }


        // 1. Scrape URL
        const scraped = await scrapeUrl(url);

        // 2. Convert HTML → Markdown
        const markdown = htmlToMarkdown(
            scraped.html,
            url
        );

        console.log(markdown);

        return res.json({
            success: true,
            title: scraped.title,
            markdown,
        });

    } catch (error) {
        console.error("Failed to scrape URL:", error);

        res.status(500).json({
            message: "Failed to scrape URL",
        });
    }
};