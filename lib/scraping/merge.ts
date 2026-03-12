import type { ViatorProduct } from "@/lib/viator/types";
import type { MergedProduct, ScrapedListing } from "@/lib/scraping/types";

/**
 * Merge Viator API product data with scraped page data.
 *
 * Rules:
 * - API wins: rating, reviewCount, pricing, tags, destinations, images (for count scoring)
 * - Scrape wins: description (if longer), inclusions, exclusions, highlights, itinerary
 *   text, photoUrls, badges, meetingPoint, operatorName, cancellationPolicy text
 * - If scraping failed (scraped is null): dataSource = 'api-only', all scrape fields empty
 */
export function mergeProductData(
  apiProduct: ViatorProduct,
  scraped: ScrapedListing | null
): MergedProduct {
  const incompleteFields: string[] = [];

  if (!scraped) {
    return {
      ...apiProduct,
      highlights: [],
      photoUrls: [],
      badges: [],
      meetingPoint: "",
      operatorName: "",
      dataSource: "api-only",
      incompleteFields: [
        "highlights",
        "photoUrls",
        "badges",
        "meetingPoint",
        "operatorName",
        "description (full)",
      ],
    };
  }

  // --- Description: prefer scrape if longer ---
  const apiDesc = apiProduct.description ?? "";
  const scrapedDesc = scraped.description ?? "";
  const description =
    scrapedDesc.length > apiDesc.length ? scrapedDesc : apiDesc;
  if (scrapedDesc.length === 0) incompleteFields.push("description");

  // --- Inclusions: prefer scrape if non-empty ---
  const inclusions =
    scraped.inclusions.length > 0
      ? scraped.inclusions
      : apiProduct.inclusions ?? [];
  if (scraped.inclusions.length === 0 && (apiProduct.inclusions ?? []).length === 0) {
    incompleteFields.push("inclusions");
  }

  // --- Exclusions: prefer scrape if non-empty ---
  const exclusions =
    scraped.exclusions.length > 0
      ? scraped.exclusions
      : apiProduct.exclusions ?? [];
  if (scraped.exclusions.length === 0 && (apiProduct.exclusions ?? []).length === 0) {
    incompleteFields.push("exclusions");
  }

  // --- Cancellation policy: wrap scraped string as ViatorCancellationPolicy ---
  const cancellationPolicy =
    scraped.cancellationPolicy
      ? {
          type: apiProduct.cancellationPolicy?.type ?? "STANDARD",
          description: scraped.cancellationPolicy,
        }
      : apiProduct.cancellationPolicy;

  // --- Itinerary: prefer scraped if non-empty ---
  const itinerary =
    scraped.itinerary.length > 0
      ? {
          itineraryItems: scraped.itinerary.map((stop) => ({
            pointOfInterestLocation:
              stop.name
                ? {
                    location: {
                      ref: "",
                      name: stop.name,
                    },
                  }
                : undefined,
            description: stop.description,
            duration: stop.duration,
          })),
        }
      : apiProduct.itinerary;

  // --- Flags: union of both sources ---
  const apiFlags = apiProduct.flags ?? [];
  const scrapedFlags = scraped.flags ?? [];
  const mergedFlags = [...new Set([...apiFlags, ...scrapedFlags])];

  // --- Highlights ---
  if (scraped.highlights.length === 0) incompleteFields.push("highlights");

  // --- Photo URLs ---
  if (scraped.photoUrls.length === 0) incompleteFields.push("photoUrls");

  return {
    ...apiProduct,
    // Overwrite API fields with enriched scrape data
    description,
    inclusions,
    exclusions,
    cancellationPolicy,
    itinerary,
    flags: mergedFlags,
    // New scrape-only fields
    highlights: scraped.highlights,
    photoUrls: scraped.photoUrls,
    badges: scraped.badges,
    meetingPoint: scraped.meetingPoint,
    operatorName: scraped.operatorName,
    groupSize: scraped.groupSize,
    // Metadata
    dataSource: "api+scrape",
    incompleteFields,
  };
}
