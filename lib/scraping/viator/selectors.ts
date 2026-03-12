/**
 * Viator page extraction config.
 *
 * NEXT_DATA_PATHS: dot-notation paths into the __NEXT_DATA__ JSON.
 *   - Multiple paths per field in priority order (first non-empty wins).
 *   - Viator currently uses a custom "Orion" React framework, so __NEXT_DATA__
 *     may not exist. These paths are kept as candidates — wrong paths are
 *     silently skipped. If Viator migrates to Next.js, update these paths
 *     based on a live page inspection.
 *
 * SELECTORS: CSS selectors for DOM fallback when __NEXT_DATA__ lacks a field.
 *   - Prefer data-testid and aria attributes over class names.
 *   - Update when Viator changes their DOM.
 */

export const NEXT_DATA_PATHS: Record<string, string[]> = {
  title: [
    "props.pageProps.product.title",
    "props.pageProps.productPage.product.title",
    "props.pageProps.initialData.product.title",
  ],
  description: [
    "props.pageProps.product.description",
    "props.pageProps.productPage.product.description",
    "props.pageProps.initialData.product.description",
    "props.pageProps.product.overview",
  ],
  highlights: [
    "props.pageProps.product.highlights",
    "props.pageProps.productPage.product.highlights",
    "props.pageProps.product.inclusions.highlights",
  ],
  inclusions: [
    "props.pageProps.product.inclusions.included",
    "props.pageProps.product.inclusions",
    "props.pageProps.productPage.product.inclusions",
  ],
  exclusions: [
    "props.pageProps.product.inclusions.excluded",
    "props.pageProps.product.exclusions",
    "props.pageProps.productPage.product.exclusions",
  ],
  rating: [
    "props.pageProps.product.reviews.combinedAverageRating",
    "props.pageProps.product.rating",
    "props.pageProps.productPage.product.reviews.combinedAverageRating",
  ],
  reviewCount: [
    "props.pageProps.product.reviews.totalReviews",
    "props.pageProps.product.reviewCount",
    "props.pageProps.productPage.product.reviews.totalReviews",
  ],
  price: [
    "props.pageProps.product.pricing.summary.fromPrice",
    "props.pageProps.product.price.fromPrice",
    "props.pageProps.productPage.product.pricing.summary.fromPrice",
  ],
  currency: [
    "props.pageProps.product.pricing.currency",
    "props.pageProps.product.price.currency",
  ],
  duration: [
    "props.pageProps.product.duration.fixedDurationInMinutes",
    "props.pageProps.product.duration",
    "props.pageProps.productPage.product.duration",
  ],
  cancellationPolicy: [
    "props.pageProps.product.cancellationPolicy.description",
    "props.pageProps.product.cancellationPolicy.type",
    "props.pageProps.productPage.product.cancellationPolicy.description",
  ],
  languages: [
    "props.pageProps.product.languageGuides",
    "props.pageProps.product.languages",
  ],
  meetingPoint: [
    "props.pageProps.product.logistics.start.0.description",
    "props.pageProps.product.meetingPoint.description",
    "props.pageProps.product.logistics.meetingPoint.description",
  ],
  operatorName: [
    "props.pageProps.product.supplier.name",
    "props.pageProps.product.operatorName",
    "props.pageProps.productPage.product.supplier.name",
  ],
  groupSize: [
    "props.pageProps.product.groupSize.maxGroupSize",
    "props.pageProps.product.maxGroupSize",
  ],
  flags: [
    "props.pageProps.product.flags",
    "props.pageProps.productPage.product.flags",
  ],
  itinerary: [
    "props.pageProps.product.itinerary.itineraryItems",
    "props.pageProps.product.itinerary",
    "props.pageProps.productPage.product.itinerary.itineraryItems",
  ],
  photos: [
    "props.pageProps.product.images",
    "props.pageProps.productPage.product.images",
  ],
};

export const SELECTORS = {
  title: "h1",
  readMoreButton:
    'button:has-text("Read more"), button:has-text("Show more"), [data-testid="read-more"]',
  description:
    '[data-testid="product-description"], [data-testid="overview-description"]',
  highlights: '[data-testid="highlights"] li, [data-testid="key-facts"] li',
  inclusions:
    '[data-testid="inclusions"] li, [data-testid="whats-included"] li',
  exclusions:
    '[data-testid="exclusions"] li, [data-testid="whats-not-included"] li',
  rating:
    '[data-testid="rating-value"], [data-testid="overall-rating"], [aria-label*="rating"] span:first-child',
  reviewCount:
    '[data-testid="review-count"], [data-testid="total-reviews"]',
  price:
    '[data-testid="price"], [data-testid="from-price"], [data-testid="booking-price"]',
  originalPrice: '[data-testid="original-price"], [data-testid="strike-price"]',
  photoGallery:
    '[data-testid="gallery"] img, [data-testid="photo-gallery"] img, [data-testid="product-gallery"] img',
  duration: '[data-testid="duration"], [data-testid="tour-duration"]',
  cancellation:
    '[data-testid="cancellation-policy"], [data-testid="refund-policy"]',
  languages: '[data-testid="languages"], [data-testid="language-guides"]',
  meetingPoint:
    '[data-testid="meeting-point"], [data-testid="meeting-pickup"], [data-testid="start-location"]',
  operatorName:
    '[data-testid="operator-name"], [data-testid="supplied-by"], [data-testid="provider-name"]',
  badges:
    '[data-testid="badge"], [data-testid="product-badge"], [data-testid="award-badge"]',
  flags:
    '[data-testid="flag"], [data-testid="product-flag"], [data-testid="urgency-tag"]',
  cookieAccept:
    'button:has-text("Accept all"), button:has-text("Accept cookies"), button:has-text("I agree"), button:has-text("Got it"), [data-testid="accept-cookies"]',
  itineraryItems:
    '[data-testid="itinerary-item"], [data-testid="stop-item"]',
};

/**
 * Detect DataDome / captcha challenge pages.
 * Returns true if the HTML is a bot-protection challenge, not real content.
 */
export function isDataDomeChallenge(html: string): boolean {
  return (
    html.includes("captcha-delivery.com") ||
    html.includes("geo.captcha-delivery.com") ||
    (html.includes("var dd=") && html.length < 3000)
  );
}
