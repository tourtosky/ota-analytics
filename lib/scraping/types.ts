import type { ViatorProduct } from "@/lib/viator/types";

export type Platform = "viator" | "getyourguide" | "klook" | "civitatis";

export interface ItineraryStop {
  type: "stop" | "pass-by";
  name: string;
  description: string;
  duration?: string;
}

export interface ScrapedListing {
  platform: Platform;
  url: string;
  productCode: string;

  // Content
  title: string;
  description: string;
  highlights: string[];
  itinerary: ItineraryStop[];
  inclusions: string[];
  exclusions: string[];

  // Metrics
  rating: number;
  reviewCount: number;
  price: {
    amount: number;
    currency: string;
    originalAmount?: number;
  };
  duration: string;

  // Media
  photoCount: number;
  photoUrls: string[];

  // Details
  cancellationPolicy: string;
  languages: string[];
  meetingPoint: string;
  groupSize?: string;
  accessibility?: string[];

  // Badges & flags
  flags: string[];
  badges: string[];

  // Operator
  operatorName: string;
  operatorResponseRate?: string;

  // Meta
  scrapedAt: Date;
  scrapeSuccess: boolean;
  scrapeErrors: string[];
}

export interface ScraperResult {
  listing: ScrapedListing | null;
  cached: boolean;
  error?: string;
}

export interface PlatformScraper {
  platform: Platform;
  canHandle(url: string): boolean;
  extractProductCode(url: string): string | null;
  scrape(url: string): Promise<ScraperResult>;
}

/**
 * MergedProduct extends ViatorProduct by ADDING fields only — no field type overrides.
 *
 * Design note: We intentionally avoid `extends Omit<ViatorProduct, 'cancellationPolicy'>`.
 * Overriding cancellationPolicy to `string` would break TypeScript assignability —
 * `string` is not assignable to `ViatorCancellationPolicy | undefined`, so
 * `calculateScores(mergedProduct, ...)` would fail to compile.
 *
 * Instead, cancellationPolicy stays typed as `ViatorCancellationPolicy | undefined`.
 * The merge function wraps any scraped cancellation string as:
 *   { type: 'STANDARD', description: scrapedString }
 * This satisfies the existing type AND passes truthiness checks in the scoring engine.
 *
 * Result: MergedProduct IS-A ViatorProduct structurally — no casts needed anywhere.
 */
export interface MergedProduct extends ViatorProduct {
  highlights: string[];
  photoUrls: string[];
  badges: string[];
  meetingPoint: string;
  operatorName: string;
  groupSize?: string;
  dataSource: "api+scrape" | "api-only";
  incompleteFields: string[];
}
