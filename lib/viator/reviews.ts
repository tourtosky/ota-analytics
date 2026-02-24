import { viatorRequest } from "./client";
import { ViatorReviewsResponse, ViatorReview } from "./types";

/**
 * Fetch reviews for a product
 */
export async function fetchReviews(
  productCode: string,
  limit: number = 20
): Promise<ViatorReview[]> {
  // Try different pagination structure - maybe it needs to be at root level
  const requestBody: any = {
    productCode,
    provider: "ALL",
    start: 1,
    count: limit,
  };

  console.log('Reviews request body:', JSON.stringify(requestBody, null, 2));

  const response = await viatorRequest<ViatorReviewsResponse>(
    "/reviews/product",
    {
      method: "POST",
      body: requestBody,
    }
  );

  return response.reviews;
}

/**
 * Filter reviews by rating threshold (for negative/neutral reviews)
 */
export function filterReviewsByRating(
  reviews: ViatorReview[],
  maxRating: number
): ViatorReview[] {
  return reviews.filter((review) => review.rating <= maxRating);
}

/**
 * Get review statistics
 */
export function getReviewStats(reviews: ViatorReview[]) {
  if (reviews.length === 0) {
    return {
      avgRating: 0,
      totalCount: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      withPhotos: 0,
    };
  }

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let withPhotos = 0;

  reviews.forEach((review) => {
    const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
    ratingDistribution[rating]++;
    if (review.photosInfo && review.photosInfo.length > 0) {
      withPhotos++;
    }
  });

  const avgRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return {
    avgRating,
    totalCount: reviews.length,
    ratingDistribution,
    withPhotos,
  };
}
