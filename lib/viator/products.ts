import { viatorRequest } from "./client";
import {
  ViatorProduct,
  ViatorProductSearchResponse,
  ViatorProductSearchResult,
  CompetitorData,
} from "./types";

/**
 * Fetch a single product by its product code
 */
export async function fetchProduct(productCode: string): Promise<ViatorProduct> {
  return await viatorRequest<ViatorProduct>(`/products/${productCode}`);
}

/**
 * Fetch multiple products in bulk (up to 500 at once)
 * Returns full product details including all images
 */
export async function fetchProductsBulk(
  productCodes: string[]
): Promise<ViatorProduct[]> {
  if (productCodes.length === 0) return [];

  // Bulk endpoint returns an array directly, not { products: [...] }
  const response = await viatorRequest<ViatorProduct[]>(
    "/products/bulk",
    {
      method: "POST",
      body: { productCodes },
    }
  );

  return Array.isArray(response) ? response : [];
}

/**
 * Search for competitor products in the same destination and category.
 * Also returns the operator's own search result (for pricing data).
 */
export async function searchCompetitors(
  destinationId: string,
  tagId: string,
  excludeProductCode: string,
  limit: number = 10
): Promise<{ competitors: ViatorProductSearchResult[]; operatorSearchResult?: ViatorProductSearchResult }> {
  const searchBody = {
    filtering: {
      destination: destinationId,
      tags: [tagId],
    },
    currency: "USD",
    pagination: {
      offset: 0,
      limit: limit + 5,
    },
  };

  const response = await viatorRequest<ViatorProductSearchResponse>(
    "/products/search",
    {
      method: "POST",
      body: searchBody,
    }
  );

  const operatorSearchResult = response.products.find(
    (product) => product.productCode === excludeProductCode
  );

  const competitors = response.products
    .filter((product) => product.productCode !== excludeProductCode)
    .slice(0, limit);

  return { competitors, operatorSearchResult };
}

/**
 * Convert search results to simplified competitor data.
 * Enriches with full product details (photo counts) via bulk API.
 */
export async function formatCompetitorData(
  products: ViatorProductSearchResult[]
): Promise<CompetitorData[]> {
  // Get basic data from search results (has price, but only 1 cover image)
  const basicData = products
    .filter((product) => product.reviews && product.pricing)
    .map((product) => ({
      productCode: product.productCode,
      title: product.title || "Untitled",
      rating: product.reviews?.combinedAverageRating || 0,
      reviewCount: product.reviews?.totalReviews || 0,
      price: product.pricing?.summary?.fromPrice || 0,
      currency: product.pricing?.currency || "USD",
      photoCount: 0, // Will be enriched from bulk fetch
      flags: product.flags || [],
      destinationRef: product.destinations?.[0]?.ref ?? "",
    }));

  // Fetch full product details to get real photo counts
  const productCodes = basicData.map((d) => d.productCode);
  try {
    const fullProducts = await fetchProductsBulk(productCodes);
    const photoCountMap = new Map<string, number>();
    for (const fp of fullProducts) {
      photoCountMap.set(fp.productCode, fp.images?.length || 0);
    }

    for (const item of basicData) {
      item.photoCount = photoCountMap.get(item.productCode) || 0;
    }
  } catch (error) {
    console.error("Failed to fetch bulk product details for photo counts:", error);
    // Continue with photoCount = 0 rather than failing
  }

  return basicData;
}

/**
 * Extract price from a search result
 */
export function getSearchResultPrice(
  searchResult: ViatorProductSearchResult
): { price: number; currency: string } {
  return {
    price: searchResult.pricing?.summary?.fromPrice || 0,
    currency: searchResult.pricing?.currency || "USD",
  };
}

/**
 * Fetch the per-person price for a product via availability check.
 * Used when the product doesn't appear in search results.
 */
export async function fetchProductPrice(
  productCode: string,
  currency: string = "USD"
): Promise<{ price: number; currency: string }> {
  // Check availability for a date 7 days out with 2 adults
  const travelDate = new Date(Date.now() + 7 * 86400000)
    .toISOString()
    .split("T")[0];

  try {
    const response = await viatorRequest<{
      currency: string;
      bookableItems: Array<{
        lineItems: Array<{
          ageBand: string;
          numberOfTravelers: number;
          subtotalPrice: {
            price: {
              recommendedRetailPrice: number;
              partnerNetPrice: number;
            };
          };
        }>;
      }>;
    }>("/availability/check", {
      method: "POST",
      body: {
        productCode,
        travelDate,
        currency,
        paxMix: [{ ageBand: "ADULT", numberOfTravelers: 2 }],
      },
    });

    // Get per-person price from first bookable item
    const firstItem = response.bookableItems?.[0];
    const lineItem = firstItem?.lineItems?.[0];
    if (lineItem) {
      const totalPrice =
        lineItem.subtotalPrice?.price?.recommendedRetailPrice || 0;
      const perPerson = totalPrice / lineItem.numberOfTravelers;
      return { price: Math.round(perPerson * 100) / 100, currency };
    }
  } catch (error) {
    console.error("Failed to fetch product price via availability:", error);
  }

  return { price: 0, currency };
}

/**
 * Calculate median value from array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Get competitor statistics for comparison
 */
export function getCompetitorStats(competitors: CompetitorData[]) {
  if (competitors.length === 0) {
    return {
      medianRating: 0,
      medianReviewCount: 0,
      medianPrice: 0,
      medianPhotoCount: 0,
      avgRating: 0,
      avgReviewCount: 0,
    };
  }

  const ratings = competitors.map((c) => c.rating);
  const reviewCounts = competitors.map((c) => c.reviewCount);
  const prices = competitors.map((c) => c.price);
  const photoCounts = competitors.map((c) => c.photoCount);

  return {
    medianRating: calculateMedian(ratings),
    medianReviewCount: calculateMedian(reviewCounts),
    medianPrice: calculateMedian(prices),
    medianPhotoCount: calculateMedian(photoCounts),
    avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    avgReviewCount: reviewCounts.reduce((a, b) => a + b, 0) / reviewCounts.length,
  };
}
