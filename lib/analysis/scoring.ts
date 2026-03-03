import { ViatorProduct, ProductScores, CompetitorData } from "../viator/types";
import { getCompetitorStats } from "../viator/products";

/**
 * Score title quality (0-100)
 * Criteria:
 * - Length (50-80 chars optimal)
 * - Contains location
 * - Contains unique selling points
 * - Keyword density vs competitors
 */
function scoreTitleQuality(
  product: ViatorProduct,
  competitors: CompetitorData[]
): number {
  let score = 0;
  const title = product.title;
  const titleLength = title.length;

  // Length scoring (30 points)
  if (titleLength >= 50 && titleLength <= 80) {
    score += 30;
  } else if (titleLength >= 40 && titleLength < 50) {
    score += 20;
  } else if (titleLength > 80 && titleLength <= 100) {
    score += 20;
  } else if (titleLength >= 30 && titleLength < 40) {
    score += 10;
  }

  // Contains location (20 points)
  // Note: Destinations from API only have 'ref' field, not 'name'
  // We'll award points if destinations exist (location targeting is good)
  if (product.destinations && product.destinations.length > 0) {
    score += 20;
  }

  // Contains unique selling points (30 points)
  const keywords = [
    "private",
    "skip-the-line",
    "skip the line",
    "small group",
    "luxury",
    "premium",
    "vip",
    "exclusive",
    "guided",
    "expert",
    "sunset",
    "sunrise",
    "full-day",
    "half-day",
  ];
  const titleLower = title.toLowerCase();
  const keywordMatches = keywords.filter((kw) => titleLower.includes(kw)).length;
  score += Math.min(keywordMatches * 10, 30);

  // Keyword coverage vs competitors (20 points)
  if (competitors.length > 0) {
    const competitorTitles = competitors.map((c) => c.title.toLowerCase());
    const allCompetitorWords = competitorTitles.join(" ").split(/\s+/);
    const uniqueCompetitorWords = [...new Set(allCompetitorWords)];

    const titleWords = new Set(titleLower.split(/\s+/));
    const coverage = uniqueCompetitorWords.filter((word) =>
      titleWords.has(word)
    ).length;

    const coveragePercent = Math.min(
      (coverage / uniqueCompetitorWords.length) * 100,
      100
    );
    score += (coveragePercent / 100) * 20;
  } else {
    score += 10; // Default partial credit
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Score description quality (0-100)
 * Criteria:
 * - Length (>300 words optimal)
 * - Includes key sections
 * - Keyword coverage
 */
function scoreDescriptionQuality(product: ViatorProduct): number {
  let score = 0;
  const description = product.description;
  const wordCount = description.split(/\s+/).length;

  // Length scoring (40 points)
  if (wordCount >= 300) {
    score += 40;
  } else if (wordCount >= 200) {
    score += 30;
  } else if (wordCount >= 100) {
    score += 20;
  } else if (wordCount >= 50) {
    score += 10;
  }

  // Has key sections (30 points)
  const descLower = description.toLowerCase();
  const sections = [
    "highlights",
    "what you'll do",
    "what's included",
    "itinerary",
    "overview",
    "experience",
  ];
  const sectionMatches = sections.filter((s) => descLower.includes(s)).length;
  score += Math.min(sectionMatches * 10, 30);

  // Keyword richness (30 points)
  const keywords = [
    "tour",
    "guide",
    "visit",
    "explore",
    "experience",
    "discover",
    "see",
    "enjoy",
    "learn",
    "historic",
    "famous",
    "popular",
  ];
  const keywordMatches = keywords.filter((kw) => descLower.includes(kw)).length;
  score += Math.min(keywordMatches * 3, 30);

  return Math.min(Math.round(score), 100);
}

/**
 * Score pricing (0-100)
 * Criteria:
 * - Position relative to competitor median
 * - Within ±10% of median = good
 * - Much higher without justification = bad
 */
function scorePricing(
  product: ViatorProduct,
  competitorStats: ReturnType<typeof getCompetitorStats>
): number {
  if (competitorStats.medianPrice === 0) {
    return 50; // No competitor data, neutral score
  }

  const price = product.pricing?.summary?.fromPrice || product.pricing?.price || 0;
  const median = competitorStats.medianPrice;
  const percentDiff = ((price - median) / median) * 100;

  let score = 100;

  // Within ±10% is optimal
  if (Math.abs(percentDiff) <= 10) {
    score = 100;
  }
  // Within ±20% is good
  else if (Math.abs(percentDiff) <= 20) {
    score = 85;
  }
  // Within ±30% is acceptable
  else if (Math.abs(percentDiff) <= 30) {
    score = 70;
  }
  // Within ±50% is concerning
  else if (Math.abs(percentDiff) <= 50) {
    score = 50;
  }
  // More than 50% difference is critical
  else {
    score = Math.max(30 - Math.abs(percentDiff - 50), 0);
  }

  return Math.round(score);
}

/**
 * Score reviews (0-100)
 * Criteria:
 * - Rating vs competitor avg
 * - Review count vs competitor median
 * - Recency (if available)
 */
function scoreReviews(
  product: ViatorProduct,
  competitorStats: ReturnType<typeof getCompetitorStats>
): number {
  let score = 0;

  const rating = product.reviews.combinedAverageRating;
  const reviewCount = product.reviews.totalReviews;

  // Rating scoring (50 points)
  if (competitorStats.avgRating > 0) {
    const ratingDiff = rating - competitorStats.avgRating;
    if (ratingDiff >= 0) {
      score += 50; // At or above average
    } else {
      // Below average, scale down
      const penalty = Math.abs(ratingDiff) * 20; // 0.1 diff = 2 points lost
      score += Math.max(50 - penalty, 0);
    }
  } else {
    // No competitor data, score based on absolute rating
    score += (rating / 5) * 50;
  }

  // Review count scoring (50 points)
  if (competitorStats.medianReviewCount > 0) {
    const countRatio = reviewCount / competitorStats.medianReviewCount;
    if (countRatio >= 1) {
      score += 50; // At or above median
    } else {
      score += countRatio * 50;
    }
  } else {
    // No competitor data, score based on having reviews
    if (reviewCount > 100) score += 50;
    else if (reviewCount > 50) score += 40;
    else if (reviewCount > 20) score += 30;
    else if (reviewCount > 5) score += 20;
    else if (reviewCount > 0) score += 10;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Score photos (0-100)
 * Criteria:
 * - Count (6+ recommended, 9+ excellent)
 * - Vs competitor median
 */
function scorePhotos(
  product: ViatorProduct,
  competitorStats: ReturnType<typeof getCompetitorStats>
): number {
  const photoCount = product.images.length;

  let score = 0;

  // Absolute count scoring (50 points)
  if (photoCount >= 12) {
    score += 50;
  } else if (photoCount >= 9) {
    score += 45;
  } else if (photoCount >= 6) {
    score += 35;
  } else if (photoCount >= 3) {
    score += 20;
  } else if (photoCount >= 1) {
    score += 10;
  }

  // Relative to competitors (50 points)
  if (competitorStats.medianPhotoCount > 0) {
    const ratio = photoCount / competitorStats.medianPhotoCount;
    if (ratio >= 1) {
      score += 50;
    } else {
      score += ratio * 50;
    }
  } else {
    score += 25; // Default partial credit
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Score completeness (0-100)
 * Criteria:
 * - Inclusions filled
 * - Exclusions filled
 * - Itinerary present
 * - Cancellation policy set
 * - Languages listed
 */
function scoreCompleteness(product: ViatorProduct): number {
  let score = 0;

  // Inclusions (20 points)
  if (product.inclusions && product.inclusions.length > 0) {
    score += 20;
  }

  // Exclusions (20 points)
  if (product.exclusions && product.exclusions.length > 0) {
    score += 20;
  }

  // Itinerary (30 points)
  if (
    product.itinerary &&
    product.itinerary.itineraryItems &&
    product.itinerary.itineraryItems.length > 0
  ) {
    score += 30;
  }

  // Cancellation policy (20 points)
  if (product.cancellationPolicy) {
    score += 20;
  }

  // Languages (10 points)
  if (product.languages && product.languages.length > 0) {
    score += 10;
  }

  return Math.round(score);
}

/**
 * Calculate overall product scores
 */
export function calculateScores(
  product: ViatorProduct,
  competitors: CompetitorData[]
): ProductScores {
  const competitorStats = getCompetitorStats(competitors);

  const titleScore = scoreTitleQuality(product, competitors);
  const descriptionScore = scoreDescriptionQuality(product);
  const pricingScore = scorePricing(product, competitorStats);
  const reviewsScore = scoreReviews(product, competitorStats);
  const photosScore = scorePhotos(product, competitorStats);
  const completenessScore = scoreCompleteness(product);

  // Weighted overall score
  const weights = {
    title: 0.15,
    description: 0.15,
    pricing: 0.2,
    reviews: 0.25,
    photos: 0.15,
    completeness: 0.1,
  };

  const overallScore = Math.round(
    titleScore * weights.title +
      descriptionScore * weights.description +
      pricingScore * weights.pricing +
      reviewsScore * weights.reviews +
      photosScore * weights.photos +
      completenessScore * weights.completeness
  );

  return {
    title: titleScore,
    description: descriptionScore,
    pricing: pricingScore,
    reviews: reviewsScore,
    photos: photosScore,
    completeness: completenessScore,
    overall: overallScore,
  };
}

/**
 * Get score interpretation
 */
export function getScoreInterpretation(
  score: number
): { label: string; color: string; emoji: string } {
  if (score >= 80) {
    return { label: "Excellent", color: "green", emoji: "🟢" };
  } else if (score >= 60) {
    return { label: "Good", color: "yellow", emoji: "🟡" };
  } else if (score >= 40) {
    return { label: "Needs work", color: "orange", emoji: "⚠️" };
  } else {
    return { label: "Critical issues", color: "red", emoji: "🔴" };
  }
}
