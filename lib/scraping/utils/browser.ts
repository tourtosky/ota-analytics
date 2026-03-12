import { chromium, type Browser } from "playwright";

let browserInstance: Browser | null = null;
let scrapeCount = 0;
let lastRestartAt = Date.now();

const MAX_SCRAPES_BEFORE_RESTART = 50;
const RESTART_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the shared browser instance, launching or restarting as needed.
 *
 * Concurrency note: Playwright Browser supports multiple concurrent pages safely.
 * Counter drift under concurrent requests is an accepted MVP limitation.
 */
export async function getBrowser(): Promise<Browser> {
  const elapsed = Date.now() - lastRestartAt;
  const needsRestart =
    (browserInstance !== null && scrapeCount >= MAX_SCRAPES_BEFORE_RESTART) ||
    (browserInstance !== null && elapsed >= RESTART_INTERVAL_MS);

  if (needsRestart) {
    await closeBrowser();
  }

  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    scrapeCount = 0;
    lastRestartAt = Date.now();
  }

  scrapeCount++;
  return browserInstance;
}

/**
 * Close the browser instance. Called on restart or graceful shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}
