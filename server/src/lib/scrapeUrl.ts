import { chromium } from "playwright";

export async function scrapeUrl(url: string) {
    const browser = await chromium.launch({
        headless: true,
    });

    try {
        const page = await browser.newPage();

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
        });

        // Optional: wait for the page to settle
        await page.waitForLoadState("networkidle", {
            timeout: 10_000,
        }).catch(() => {
            // Some websites never become completely idle.
        });

        return {
            url,
            title: await page.title(),
            html: await page.content(),
        };
    } finally {
        await browser.close();
    }
}