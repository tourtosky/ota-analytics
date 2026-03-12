import { ViatorScraper } from "@/lib/scraping/viator/scraper";
import type { PlatformScraper } from "@/lib/scraping/types";

// Singleton scraper instances
const viatorScraper = new ViatorScraper();

/**
 * Return the correct PlatformScraper for a given URL.
 *
 * Usage:
 *   const scraper = getScraperForUrl('https://www.viator.com/tours/...');
 *   const result = await scraper.scrape(url);
 */
export function getScraperForUrl(url: string): PlatformScraper {
  if (viatorScraper.canHandle(url)) return viatorScraper;

  // Future scrapers:
  // if (getYourGuideScraper.canHandle(url)) return getYourGuideScraper;
  // if (klookScraper.canHandle(url)) return klookScraper;

  throw new Error(`No scraper available for URL: ${url}`);
}
