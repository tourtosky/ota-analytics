// Viator API Response Types

export interface ViatorImage {
  url: string;
  variants: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

export interface ViatorDestination {
  ref: string;
  primary?: boolean;
  name?: string;
}

// Tags can be either numbers or objects depending on the endpoint
export type ViatorTag = number | {
  ref: string;
  name: string;
};

export interface ViatorReviewSummary {
  totalReviews: number;
  combinedAverageRating: number;
}

export interface ViatorPricing {
  currency: string;
  price: number;
  originalPrice?: number;
}

export interface ViatorItineraryItem {
  pointOfInterestLocation?: {
    location: {
      ref: string;
      name: string;
    };
  };
  description?: string;
  duration?: string;
}

export interface ViatorCancellationPolicy {
  type: string;
  description?: string;
}

export interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  images: ViatorImage[];
  duration?: {
    fixedDurationInMinutes?: number;
  };
  pricing: ViatorPricing;
  reviews: ViatorReviewSummary;
  itinerary?: {
    itineraryItems: ViatorItineraryItem[];
  };
  inclusions?: string[];
  exclusions?: string[];
  cancellationPolicy?: ViatorCancellationPolicy;
  flags?: string[];
  status: string;
  tags: ViatorTag[];
  destinations: ViatorDestination[];
  languages?: Array<{
    code: string;
    name: string;
  }>;
}

export interface ViatorProductSearchResult {
  productCode: string;
  title: string;
  images: ViatorImage[];
  pricing: ViatorPricing;
  reviews: ViatorReviewSummary;
  flags?: string[];
  destinations: ViatorDestination[];
  tags: ViatorTag[];
}

export interface ViatorProductSearchResponse {
  products: ViatorProductSearchResult[];
  totalCount: number;
}

export interface ViatorReview {
  reviewId: string;
  rating: number;
  text: string;
  title?: string;
  publishedDate: string;
  travelerType?: string;
  userName?: string;
  photosInfo?: Array<{
    photoId: string;
    photoURL: string;
  }>;
}

export interface ViatorReviewsResponse {
  reviews: ViatorReview[];
  totalCount: number;
}

export interface ProductScores {
  title: number;
  description: number;
  pricing: number;
  reviews: number;
  photos: number;
  completeness: number;
  overall: number;
}

export interface CompetitorData {
  productCode: string;
  title: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency: string;
  photoCount: number;
  flags?: string[];
}

export interface AIRecommendation {
  priority: "critical" | "high" | "medium";
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface ReviewInsight {
  positives: Array<{ theme: string; frequency: number }>;
  negatives: Array<{ theme: string; frequency: number }>;
  sentiment: "improving" | "stable" | "declining";
  keyPhrases: string[];
  opportunities: string[];
}
