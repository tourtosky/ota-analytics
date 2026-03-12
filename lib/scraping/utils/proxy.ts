export type ScrapingMode = "playwright" | "scrapingbee" | "zenrows" | "brightdata";

/**
 * Read SCRAPING_MODE env var. Defaults to "playwright" (direct, no proxy).
 */
export function getScrapingMode(): ScrapingMode {
  const mode = process.env.SCRAPING_MODE as ScrapingMode;
  const valid: ScrapingMode[] = ["playwright", "scrapingbee", "zenrows", "brightdata"];
  return valid.includes(mode) ? mode : "playwright";
}

/**
 * Returns BrightData proxy config when SCRAPING_MODE=brightdata.
 * Returns undefined otherwise (direct connection).
 */
export function getProxyConfig():
  | { server: string; username?: string; password?: string }
  | undefined {
  if (getScrapingMode() !== "brightdata") return undefined;

  const server = process.env.BRIGHTDATA_HOST;
  const username = process.env.BRIGHTDATA_USER;
  const password = process.env.BRIGHTDATA_PASS;

  if (!server) {
    throw new Error("BRIGHTDATA_HOST env var required when SCRAPING_MODE=brightdata");
  }

  return { server, username, password };
}
