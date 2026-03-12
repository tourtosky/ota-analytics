import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { scrapedPages } from "@/lib/db/schema";
import type { Platform, ScrapedListing } from "@/lib/scraping/types";

/**
 * Return a cached ScrapedListing if it exists and has not expired.
 * Returns null on cache miss or expiry.
 */
export async function getCachedListing(
  url: string
): Promise<ScrapedListing | null> {
  try {
    const rows = await db
      .select()
      .from(scrapedPages)
      .where(eq(scrapedPages.url, url))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    if (new Date(row.expiresAt) < new Date()) return null;

    return row.parsedData as ScrapedListing;
  } catch (err) {
    console.warn("[scraping-cache] getCachedListing failed:", err);
    return null;
  }
}

/**
 * Write a successful ScrapedListing to cache with a 24-hour TTL.
 * Only call this when listing.scrapeSuccess === true.
 */
export async function setCachedListing(
  url: string,
  platform: Platform,
  listing: ScrapedListing
): Promise<void> {
  if (!listing.scrapeSuccess) return;

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    await db
      .insert(scrapedPages)
      .values({
        url,
        platform,
        parsedData: listing as unknown as Record<string, unknown>,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: scrapedPages.url,
        set: {
          platform,
          parsedData: listing as unknown as Record<string, unknown>,
          scrapedAt: new Date(),
          expiresAt,
        },
      });
  } catch (err) {
    console.warn("[scraping-cache] setCachedListing failed:", err);
  }

  // Probabilistic cleanup: 1% chance to delete expired rows
  if (Math.random() < 0.01) {
    db.delete(scrapedPages)
      .where(lt(scrapedPages.expiresAt, new Date()))
      .catch(() => {});
  }
}
