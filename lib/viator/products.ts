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
 * Search for competitor products in the same destination and category
 */
export async function searchCompetitors(
  destinationId: string,
  tagId: string,
  excludeProductCode: string,
  limit: number = 10
): Promise<ViatorProductSearchResult[]> {
  const searchBody = {
    filtering: {
      destination: destinationId,
      tags: [tagId],
    },
    currency: "USD", // Required by Viator API
    pagination: {
      offset: 0,
      limit: limit + 5, // Get extra in case some need to be filtered out
    },
    // Note: Sorting is optional - Viator will return results in default order
  };

  const response = await viatorRequest<ViatorProductSearchResponse>(
    "/products/search",
    {
      method: "POST",
      body: searchBody,
    }
  );

  // Filter out the operator's own product and limit results
  return response.products
    .filter((product) => product.productCode !== excludeProductCode)
    .slice(0, limit);
}

/**
 * Convert search results to simplified competitor data
 */
export function formatCompetitorData(
  products: ViatorProductSearchResult[]
): CompetitorData[] {
  return products
    .filter((product) => {
      // Filter out products with missing critical data
      return product.reviews && product.pricing && product.images;
    })
    .map((product) => ({
      productCode: product.productCode,
      title: product.title || "Untitled",
      rating: product.reviews?.combinedAverageRating || 0,
      reviewCount: product.reviews?.totalReviews || 0,
      price: product.pricing?.price || 0,
      currency: product.pricing?.currency || "USD",
      photoCount: product.images?.length || 0,
      flags: product.flags || [],
    }));
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
