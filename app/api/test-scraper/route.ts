import { NextRequest, NextResponse } from "next/server";
import { getScraperForUrl } from "@/lib/scraping/scraper-factory";
import { buildViatorUrl } from "@/lib/scraping/viator/urls";

/**
 * Manual test endpoint — DELETE after scraping is verified.
 *
 * GET /api/test-scraper?code=5678P1&dest=687
 * GET /api/test-scraper?url=https://www.viator.com/tours/...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url =
    searchParams.get("url") ??
    (searchParams.has("code") && searchParams.has("dest")
      ? buildViatorUrl(searchParams.get("dest")!, searchParams.get("code")!)
      : null);

  if (!url) {
    return NextResponse.json(
      { error: "Provide ?url= or ?code=&dest= query params" },
      { status: 400 }
    );
  }

  const start = Date.now();

  try {
    const scraper = getScraperForUrl(url);
    const result = await scraper.scrape(url);
    const elapsed = Date.now() - start;

    return NextResponse.json({
      url,
      elapsed_ms: elapsed,
      cached: result.cached,
      error: result.error,
      listing: result.listing
        ? {
            title: result.listing.title,
            description_length: result.listing.description.length,
            description_preview: result.listing.description.substring(0, 300),
            highlights_count: result.listing.highlights.length,
            highlights: result.listing.highlights,
            itinerary_count: result.listing.itinerary.length,
            itinerary: result.listing.itinerary,
            inclusions_count: result.listing.inclusions.length,
            inclusions: result.listing.inclusions,
            exclusions_count: result.listing.exclusions.length,
            rating: result.listing.rating,
            reviewCount: result.listing.reviewCount,
            price: result.listing.price,
            duration: result.listing.duration,
            photoCount: result.listing.photoCount,
            photoUrls_count: result.listing.photoUrls.length,
            photoUrls_preview: result.listing.photoUrls.slice(0, 3),
            cancellationPolicy: result.listing.cancellationPolicy,
            languages: result.listing.languages,
            meetingPoint: result.listing.meetingPoint,
            operatorName: result.listing.operatorName,
            badges: result.listing.badges,
            flags: result.listing.flags,
            scrapeSuccess: result.listing.scrapeSuccess,
            scrapeErrors: result.listing.scrapeErrors,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        elapsed_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
