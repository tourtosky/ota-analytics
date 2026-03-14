import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import fs from "fs";
import { fetchPageHtml } from "@/lib/scraping/utils/browser";
import { withRetry, NonRetryableError } from "@/lib/scraping/utils/retry";
import { getCachedListing, setCachedListing } from "@/lib/scraping/utils/cache";
import { SELECTORS, isDataDomeChallenge } from "./selectors";
import { extractViatorProductCode } from "./urls";
import type {
  PlatformScraper,
  ScrapedListing,
  ScraperResult,
  ItineraryStop,
} from "@/lib/scraping/types";
import { logAdminEvent } from "@/lib/admin/events";

/** JSON-LD Product+TouristTrip object from Viator pages */
interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string[];
  offers?: { price?: string; priceCurrency?: string };
  aggregateRating?: { ratingValue?: number; reviewCount?: number };
  itinerary?: {
    itemListElement?: Array<{
      item?: { name?: string };
    }>;
  };
  tripOrigin?: Array<{
    name?: string;
    address?: { streetAddress?: string };
  }>;
}

export class ViatorScraper implements PlatformScraper {
  platform = "viator" as const;

  canHandle(url: string): boolean {
    return url.includes("viator.com");
  }

  extractProductCode(url: string): string | null {
    return extractViatorProductCode(url);
  }

  async scrape(url: string): Promise<ScraperResult> {
    // Check cache first
    const cached = await getCachedListing(url);
    if (cached) {
      console.log(`[viator-scraper] Cache hit: ${url}`);
      logAdminEvent("scrape_cache_hit", { url, productCode: this.extractProductCode(url) });
      return { listing: cached, cached: true };
    }

    console.log(`[viator-scraper] Scraping: ${url}`);

    try {
      const scrapeStart = Date.now();
      const listing = await withRetry(() => this.scrapeOnce(url));
      if (listing.scrapeSuccess) {
        await setCachedListing(url, "viator", listing);
      }
      logAdminEvent("scrape_success", {
        url,
        productCode: this.extractProductCode(url),
        durationMs: Date.now() - scrapeStart,
      });
      return { listing, cached: false };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[viator-scraper] All retries failed for ${url}:`, error);
      if (error.includes("DataDome")) {
        logAdminEvent("scrape_blocked", { url, reason: "DataDome" });
      }
      return { listing: null, cached: false, error };
    }
  }

  private async scrapeOnce(url: string): Promise<ScrapedListing> {
    let html: string;
    try {
      html = await fetchPageHtml(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ZenRows error 4")) {
        throw new NonRetryableError(msg);
      }
      throw err;
    }

    // Debug: save raw HTML for inspection
    try {
      fs.writeFileSync("/tmp/viator-debug.html", html);
      console.log(`[viator-scraper] Saved ${html.length} bytes to /tmp/viator-debug.html`);
    } catch {
      // ignore debug save errors
    }

    if (isDataDomeChallenge(html)) {
      throw new NonRetryableError("DataDome challenge detected — page blocked by bot protection");
    }

    return this.extractData(html, url);
  }

  private extractData(html: string, url: string): ScrapedListing {
    const errors: string[] = [];
    const productCode = this.extractProductCode(url) ?? "";
    const $ = cheerio.load(html);

    // Parse JSON-LD (primary structured data source)
    const jsonLd = this.parseJsonLd($);
    if (jsonLd) {
      console.log("[viator-scraper] JSON-LD found with keys:", Object.keys(jsonLd).join(", "));
    } else {
      console.log("[viator-scraper] No JSON-LD Product found, using DOM only");
    }

    // --- Title ---
    const title =
      jsonLd?.name?.trim() ??
      this.getTextFromDOM($, SELECTORS.title) ??
      "";
    if (!title) errors.push("title");

    // --- Description ---
    // JSON-LD has a short description; DOM overview is usually longer
    let domDescription = this.getTextFromDOM($, SELECTORS.description) ?? "";
    // Strip leading "Overview" heading that gets concatenated
    domDescription = domDescription.replace(/^Overview\s*/i, "").trim();
    const jsonLdDescription = jsonLd?.description?.trim() ?? "";
    // Prefer whichever is longer (DOM overview often has more detail)
    const description =
      domDescription.length > jsonLdDescription.length ? domDescription : jsonLdDescription;
    if (!description) errors.push("description");

    // --- Inclusions ---
    const inclusions = this.getTextArrayFromDOM($, SELECTORS.inclusions) ?? [];

    // --- Itinerary (from JSON-LD + DOM) ---
    const itinerary = this.extractItinerary($, jsonLd);

    // --- Rating ---
    const rating = jsonLd?.aggregateRating?.ratingValue ?? this.extractRatingFromDOM($) ?? 0;

    // --- Review count ---
    const reviewCount =
      jsonLd?.aggregateRating?.reviewCount ?? this.extractReviewCountFromDOM($) ?? 0;

    // --- Price ---
    const jsonLdPrice = jsonLd?.offers?.price ? parseFloat(jsonLd.offers.price) : null;
    const priceAmount =
      jsonLdPrice && !isNaN(jsonLdPrice)
        ? jsonLdPrice
        : this.extractPriceFromDOM($);
    const currency = jsonLd?.offers?.priceCurrency ?? "USD";

    // --- Duration (from product attributes) ---
    const duration = this.extractDurationFromDOM($);

    // --- Photos ---
    let photoUrls: string[] = [];
    let photoCount = 0;
    if (jsonLd?.image && Array.isArray(jsonLd.image)) {
      photoUrls = jsonLd.image.filter((u): u is string => typeof u === "string").slice(0, 20);
      photoCount = jsonLd.image.length;
    }
    // Also grab DOM gallery images (may have more/different photos)
    const domPhotos = this.extractPhotosFromDOM($);
    if (domPhotos.length > photoUrls.length) {
      photoUrls = domPhotos;
      photoCount = Math.max(photoCount, domPhotos.length);
    }

    // --- Cancellation policy ---
    const cancellationPolicy = this.getTextFromDOM($, SELECTORS.cancellation) ?? "";

    // --- Languages (from product attributes) ---
    const languages = this.extractLanguagesFromDOM($);

    // --- Meeting point ---
    const meetingPoint = this.extractMeetingPointFromDOM($, jsonLd);

    // --- Operator name ---
    const operatorRaw = this.getTextFromDOM($, SELECTORS.operatorName) ?? "";
    const operatorName = operatorRaw.replace(/^Supplied by\s*/i, "").trim();

    // --- Flags & badges (from product attributes) ---
    const attributes = this.getTextArrayFromDOM($, SELECTORS.productAttributes) ?? [];
    const flags: string[] = [];
    const badges: string[] = [];
    for (const attr of attributes) {
      if (attr.includes("Pickup")) flags.push("Pickup offered");
      if (attr.includes("Mobile ticket")) flags.push("Mobile ticket");
      if (attr.toLowerCase().includes("best seller")) badges.push("Best Seller");
      if (attr.toLowerCase().includes("likely to sell out")) badges.push("Likely to Sell Out");
    }

    const scrapeSuccess = title.length > 0;

    return {
      platform: "viator",
      url,
      productCode,
      title,
      description,
      highlights: [], // Viator pages don't have a separate highlights section in DOM
      itinerary,
      inclusions,
      exclusions: [], // Exclusions not visible in current DOM structure
      rating,
      reviewCount,
      price: {
        amount: priceAmount,
        currency,
        originalAmount: undefined,
      },
      duration,
      photoCount,
      photoUrls,
      cancellationPolicy,
      languages,
      meetingPoint,
      groupSize: undefined,
      flags,
      badges,
      operatorName,
      scrapedAt: new Date(),
      scrapeSuccess,
      scrapeErrors: errors,
    };
  }

  // ── JSON-LD parsing ────────────────────────────────────────────────────────

  private parseJsonLd($: CheerioAPI): JsonLdProduct | null {
    const scripts = $('script[type="application/ld+json"]');
    let product: JsonLdProduct | null = null;

    scripts.each((_, el) => {
      if (product) return; // already found
      try {
        const raw = $(el).html();
        if (!raw) return;
        const parsed = JSON.parse(raw);

        // JSON-LD can be a single object or an array
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          if (types.includes("Product") || types.includes("TouristTrip")) {
            product = item as JsonLdProduct;
            return;
          }
        }
      } catch {
        // malformed JSON-LD, skip
      }
    });

    return product;
  }

  // ── Itinerary extraction ───────────────────────────────────────────────────

  private extractItinerary($: CheerioAPI, jsonLd: JsonLdProduct | null): ItineraryStop[] {
    // Try JSON-LD itinerary first
    const jsonLdStops = jsonLd?.itinerary?.itemListElement;
    if (jsonLdStops && jsonLdStops.length > 0) {
      return jsonLdStops
        .map((item): ItineraryStop | null => {
          const name = item.item?.name ?? "";
          if (!name) return null;
          return { type: "stop", name, description: "" };
        })
        .filter((s): s is ItineraryStop => s !== null);
    }

    // Fallback: DOM itinerary items (richer data with duration/description)
    const domStops: ItineraryStop[] = [];
    $(SELECTORS.itineraryItems).each((_, el) => {
      const text = $(el).text().trim();
      if (!text) return;
      // DOM itinerary items contain: "1 Stop Name Duration • Admission details"
      // Extract the name (skip leading number)
      const nameMatch = text.match(/^\d+\s*(.+?)(?:\s*\d+\s*(?:minutes?|hours?)|$)/i);
      const name = nameMatch ? nameMatch[1].trim() : text.substring(0, 100);
      domStops.push({ type: "stop", name, description: text });
    });
    return domStops;
  }

  // ── DOM extraction helpers ─────────────────────────────────────────────────

  private extractRatingFromDOM($: CheerioAPI): number | null {
    // First aria-label with "Rated X out of 5" is the product rating
    const ratingEl = $('[aria-label^="Rated"]').first();
    if (ratingEl.length > 0) {
      const label = ratingEl.attr("aria-label") ?? "";
      const match = label.match(/Rated\s+([\d.]+)\s+out of/i);
      if (match) return parseFloat(match[1]);
    }
    return null;
  }

  private extractReviewCountFromDOM($: CheerioAPI): number | null {
    const reviewText = this.getTextFromDOM($, SELECTORS.reviewLink);
    if (reviewText) {
      const match = reviewText.match(/([\d,]+)\s*Reviews?/i);
      if (match) return parseInt(match[1].replace(/,/g, ""), 10);
    }
    return null;
  }

  private extractPriceFromDOM($: CheerioAPI): number {
    const priceText = this.getTextFromDOM($, SELECTORS.price);
    if (priceText) {
      const cleaned = priceText.replace(/[^0-9.]/g, "");
      const val = parseFloat(cleaned);
      if (!isNaN(val)) return val;
    }
    return 0;
  }

  private extractDurationFromDOM($: CheerioAPI): string {
    const attrs = this.getTextArrayFromDOM($, SELECTORS.productAttributes) ?? [];
    for (const attr of attrs) {
      if (/\d+\s*(hour|minute|day)/i.test(attr)) {
        return attr.replace(/\(approx\.\)/i, "").trim();
      }
    }
    return "";
  }

  private extractLanguagesFromDOM($: CheerioAPI): string[] {
    const attrs = this.getTextArrayFromDOM($, SELECTORS.productAttributes) ?? [];
    for (const attr of attrs) {
      if (attr.startsWith("Offered in:")) {
        const langPart = attr.replace("Offered in:", "").trim();
        // "English and 6 more" → ["English"]
        // Could also be "English, Spanish, French"
        return langPart.split(/[,]/).map((s) => s.replace(/and \d+ more/i, "").trim()).filter(Boolean);
      }
    }
    return [];
  }

  private extractMeetingPointFromDOM($: CheerioAPI, jsonLd: JsonLdProduct | null): string {
    // JSON-LD tripOrigin
    if (jsonLd?.tripOrigin?.[0]) {
      const origin = jsonLd.tripOrigin[0];
      const parts = [origin.name, origin.address?.streetAddress].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
    // DOM fallback
    const depSection = this.getTextFromDOM($, SELECTORS.departureReturn);
    if (depSection) {
      const meetingMatch = depSection.match(new RegExp("Meeting point\\s*(.+?)(?:End point|$)", "is"));
      if (meetingMatch) return meetingMatch[1].trim().substring(0, 300);
    }
    return "";
  }

  private extractPhotosFromDOM($: CheerioAPI): string[] {
    const urls: string[] = [];
    $(SELECTORS.photoGallery).each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("data:") && urls.length < 20) {
        urls.push(src);
      }
    });
    return urls;
  }

  // ── Generic DOM helpers ────────────────────────────────────────────────────

  private getTextFromDOM($: CheerioAPI, selector: string): string | null {
    const selectors = selector.split(",").map((s) => s.trim());
    for (const sel of selectors) {
      if (sel.includes(":has-text")) continue;
      const el = $(sel).first();
      if (el.length > 0) {
        const text = el.text().trim();
        if (text) return text;
      }
    }
    return null;
  }

  private getTextArrayFromDOM($: CheerioAPI, selector: string): string[] | null {
    const selectors = selector.split(",").map((s) => s.trim());
    for (const sel of selectors) {
      if (sel.includes(":has-text")) continue;
      const elements = $(sel);
      if (elements.length > 0) {
        const texts: string[] = [];
        elements.each((_, el) => {
          const text = $(el).text().trim();
          if (text) texts.push(text);
        });
        if (texts.length > 0) return texts;
      }
    }
    return null;
  }
}
