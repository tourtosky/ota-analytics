import * as cheerio from "cheerio";
import { getBrowser } from "@/lib/scraping/utils/browser";
import { applyStealthConfig, randomDelay } from "@/lib/scraping/utils/anti-detect";
import { withRetry, NonRetryableError } from "@/lib/scraping/utils/retry";
import { getCachedListing, setCachedListing } from "@/lib/scraping/utils/cache";
import { NEXT_DATA_PATHS, SELECTORS, isDataDomeChallenge } from "./selectors";
import { extractViatorProductCode } from "./urls";
import type {
  PlatformScraper,
  ScrapedListing,
  ScraperResult,
  ItineraryStop,
} from "@/lib/scraping/types";
import { logAdminEvent } from "@/lib/admin/events";
import type { Page } from "playwright";

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
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await applyStealthConfig(page);
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await randomDelay(2000, 5000);

      // Get raw HTML and check for DataDome challenge
      const html = await page.content();
      if (isDataDomeChallenge(html)) {
        throw new NonRetryableError("DataDome challenge detected — page blocked by bot protection");
      }

      // Dismiss cookie banner if present
      await this.dismissCookieBanner(page);

      // Scroll to trigger lazy-loaded content
      await this.scrollPage(page);

      // Get final URL (after redirect) and updated HTML
      const finalUrl = page.url();
      const fullHtml = await page.content();

      return await this.extractData(page, fullHtml, finalUrl);
    } finally {
      await page.close();
    }
  }

  private async dismissCookieBanner(page: Page): Promise<void> {
    try {
      const btn = page.locator(SELECTORS.cookieAccept).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        await btn.click();
        await randomDelay(500, 1200);
      }
    } catch {
      // Not present — continue
    }
  }

  private async scrollPage(page: Page): Promise<void> {
    for (let i = 1; i <= 4; i++) {
      await page.evaluate((fraction: number) => {
        window.scrollTo(0, document.body.scrollHeight * fraction);
      }, i / 4);
      await randomDelay(400, 800);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(300, 600);
  }

  private async extractData(
    page: Page,
    html: string,
    url: string
  ): Promise<ScrapedListing> {
    const errors: string[] = [];
    const productCode = this.extractProductCode(url) ?? "";

    // Parse __NEXT_DATA__ JSON (primary source — may not exist on Orion framework)
    const nextData = this.parseNextData(html);

    // --- Title ---
    const title =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.title) ??
      (await this.getTextFromDOM(page, SELECTORS.title)) ??
      "";
    if (!title) errors.push("title");

    // --- Description ---
    let description =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.description) ?? "";
    if (!description) {
      // Try clicking "Read more" then extracting
      description = await this.expandDescription(page);
      if (!description) errors.push("description");
    }

    // --- Highlights ---
    const highlights =
      this.getNextDataStringArray(nextData, NEXT_DATA_PATHS.highlights) ??
      (await this.getTextArrayFromDOM(page, SELECTORS.highlights)) ??
      [];

    // --- Inclusions ---
    const inclusions =
      this.getNextDataStringArray(nextData, NEXT_DATA_PATHS.inclusions) ??
      (await this.getTextArrayFromDOM(page, SELECTORS.inclusions)) ??
      [];

    // --- Exclusions ---
    const exclusions =
      this.getNextDataStringArray(nextData, NEXT_DATA_PATHS.exclusions) ??
      (await this.getTextArrayFromDOM(page, SELECTORS.exclusions)) ??
      [];

    // --- Itinerary ---
    const itinerary = this.extractItinerary(nextData);

    // --- Rating ---
    const ratingRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.rating);
    const rating =
      typeof ratingRaw === "number"
        ? ratingRaw
        : parseFloat(
            (await this.getTextFromDOM(page, SELECTORS.rating)) ?? "0"
          ) || 0;

    // --- Review count ---
    const reviewCountRaw = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.reviewCount
    );
    const reviewCount =
      typeof reviewCountRaw === "number"
        ? reviewCountRaw
        : parseInt(
            (
              (await this.getTextFromDOM(page, SELECTORS.reviewCount)) ?? "0"
            ).replace(/[^0-9]/g, ""),
            10
          ) || 0;

    // --- Price ---
    const priceRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.price);
    const priceAmount =
      typeof priceRaw === "number"
        ? priceRaw
        : parseFloat(
            (
              (await this.getTextFromDOM(page, SELECTORS.price)) ?? "0"
            ).replace(/[^0-9.]/g, "")
          ) || 0;
    const currencyRaw =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.currency) ?? "USD";
    const originalPriceText = await this.getTextFromDOM(
      page,
      SELECTORS.originalPrice
    );
    const originalAmount = originalPriceText
      ? parseFloat(originalPriceText.replace(/[^0-9.]/g, "")) || undefined
      : undefined;

    // --- Duration ---
    const durationRaw = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.duration
    );
    let duration = "";
    if (typeof durationRaw === "number") {
      duration =
        durationRaw >= 60
          ? `${Math.floor(durationRaw / 60)}h ${durationRaw % 60 > 0 ? `${durationRaw % 60}m` : ""}`.trim()
          : `${durationRaw} minutes`;
    } else if (typeof durationRaw === "string") {
      duration = durationRaw;
    } else {
      duration =
        (await this.getTextFromDOM(page, SELECTORS.duration)) ?? "";
    }

    // --- Photos ---
    const photosFromNextData = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.photos
    );
    let photoUrls: string[] = [];
    let photoCount = 0;

    if (Array.isArray(photosFromNextData)) {
      photoUrls = photosFromNextData
        .slice(0, 20)
        .map((img: unknown) => {
          if (typeof img === "string") return img;
          if (img && typeof img === "object") {
            const imgObj = img as Record<string, unknown>;
            const variants = imgObj.variants;
            if (Array.isArray(variants) && variants.length > 0) {
              const v = variants[variants.length - 1] as Record<string, unknown>;
              return typeof v.url === "string" ? v.url : "";
            }
            return typeof imgObj.url === "string" ? imgObj.url : "";
          }
          return "";
        })
        .filter(Boolean);
      photoCount = photosFromNextData.length;
    } else {
      // Fallback to DOM
      const imgElements = await page.$$(SELECTORS.photoGallery);
      for (const el of imgElements.slice(0, 20)) {
        const src = await el.getAttribute("src");
        if (src && !src.startsWith("data:")) photoUrls.push(src);
      }
      photoCount = imgElements.length;
    }

    // --- Cancellation policy ---
    const cancellationPolicy =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.cancellationPolicy) ??
      (await this.getTextFromDOM(page, SELECTORS.cancellation)) ??
      "";

    // --- Languages ---
    const langRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.languages);
    let languages: string[] = [];
    if (Array.isArray(langRaw)) {
      languages = langRaw
        .map((l: unknown) => {
          if (typeof l === "string") return l;
          if (l && typeof l === "object") {
            const lo = l as Record<string, unknown>;
            return typeof lo.language === "string"
              ? lo.language
              : typeof lo.name === "string"
                ? lo.name
                : "";
          }
          return "";
        })
        .filter(Boolean);
    } else {
      const langText = await this.getTextFromDOM(page, SELECTORS.languages);
      if (langText) languages = langText.split(/[,;]/).map((s) => s.trim());
    }

    // --- Meeting point ---
    const meetingPoint =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.meetingPoint) ??
      (await this.getTextFromDOM(page, SELECTORS.meetingPoint)) ??
      "";

    // --- Operator name ---
    const operatorName =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.operatorName) ??
      (await this.getTextFromDOM(page, SELECTORS.operatorName)) ??
      "";

    // --- Group size ---
    const groupSizeRaw = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.groupSize
    );
    const groupSize = groupSizeRaw ? String(groupSizeRaw) : undefined;

    // --- Flags ---
    const flagsRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.flags);
    const flags: string[] = Array.isArray(flagsRaw)
      ? flagsRaw.map(String)
      : (await this.getTextArrayFromDOM(page, SELECTORS.flags)) ?? [];

    // --- Badges ---
    const badges =
      (await this.getTextArrayFromDOM(page, SELECTORS.badges)) ?? [];

    const scrapeSuccess = title.length > 0;

    return {
      platform: "viator",
      url,
      productCode,
      title,
      description,
      highlights,
      itinerary,
      inclusions,
      exclusions,
      rating,
      reviewCount,
      price: {
        amount: priceAmount,
        currency: currencyRaw,
        originalAmount,
      },
      duration,
      photoCount,
      photoUrls,
      cancellationPolicy,
      languages,
      meetingPoint,
      groupSize,
      flags,
      badges,
      operatorName,
      scrapedAt: new Date(),
      scrapeSuccess,
      scrapeErrors: errors,
    };
  }

  // ── __NEXT_DATA__ helpers ──────────────────────────────────────────────────

  private parseNextData(html: string): Record<string, unknown> | null {
    const $ = cheerio.load(html);
    const text = $("script#__NEXT_DATA__").text();
    if (!text) return null;
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Traverse a dot-notation path through a nested object.
   * Returns the value at the first path that yields a non-null result.
   */
  private getNextDataValue(
    data: Record<string, unknown> | null,
    paths: string[]
  ): unknown {
    if (!data) return null;
    for (const path of paths) {
      const parts = path.split(".");
      let current: unknown = data;
      for (const part of parts) {
        if (current == null || typeof current !== "object") {
          current = null;
          break;
        }
        current = (current as Record<string, unknown>)[part];
      }
      if (current != null) return current;
    }
    return null;
  }

  private getNextDataString(
    data: Record<string, unknown> | null,
    paths: string[]
  ): string | null {
    const val = this.getNextDataValue(data, paths);
    if (typeof val === "string" && val.trim()) return val.trim();
    return null;
  }

  private getNextDataStringArray(
    data: Record<string, unknown> | null,
    paths: string[]
  ): string[] | null {
    const val = this.getNextDataValue(data, paths);
    if (!Array.isArray(val) || val.length === 0) return null;
    const strings = val
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return typeof obj.description === "string"
            ? obj.description.trim()
            : typeof obj.text === "string"
              ? obj.text.trim()
              : "";
        }
        return "";
      })
      .filter(Boolean);
    return strings.length > 0 ? strings : null;
  }

  private extractItinerary(
    data: Record<string, unknown> | null
  ): ItineraryStop[] {
    const raw = this.getNextDataValue(data, NEXT_DATA_PATHS.itinerary);
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item: unknown): ItineraryStop | null => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;

        const loc = obj.pointOfInterestLocation as
          | Record<string, unknown>
          | undefined;
        const locName =
          typeof loc?.location === "object" && loc.location !== null
            ? ((loc.location as Record<string, unknown>).name as string) ?? ""
            : "";

        const name =
          typeof obj.title === "string"
            ? obj.title
            : typeof obj.name === "string"
              ? obj.name
              : locName;

        const description =
          typeof obj.description === "string" ? obj.description : "";
        const type =
          obj.passByWithoutStopping === true ? "pass-by" : ("stop" as const);
        const duration =
          typeof obj.duration === "string" ? obj.duration : undefined;

        if (!name && !description) return null;
        return { type, name, description, duration };
      })
      .filter((s): s is ItineraryStop => s !== null);
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────

  private async getTextFromDOM(
    page: Page,
    selector: string
  ): Promise<string | null> {
    try {
      const el = page.locator(selector).first();
      const visible = await el.isVisible({ timeout: 2000 }).catch(() => false);
      if (!visible) return null;
      return (await el.textContent())?.trim() ?? null;
    } catch {
      return null;
    }
  }

  private async getTextArrayFromDOM(
    page: Page,
    selector: string
  ): Promise<string[] | null> {
    try {
      const elements = await page.$$(selector);
      if (elements.length === 0) return null;
      const texts = await Promise.all(
        elements.map(async (el) => (await el.textContent())?.trim() ?? "")
      );
      return texts.filter(Boolean);
    } catch {
      return null;
    }
  }

  private async expandDescription(page: Page): Promise<string> {
    try {
      const btn = page.locator(SELECTORS.readMoreButton).first();
      const visible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        await btn.click();
        await randomDelay(500, 1000);
      }
      return (
        (await this.getTextFromDOM(page, SELECTORS.description)) ?? ""
      );
    } catch {
      return "";
    }
  }
}
