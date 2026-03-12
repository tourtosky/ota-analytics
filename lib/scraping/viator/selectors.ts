/**
 * Viator page extraction config.
 *
 * JSON-LD (schema.org): Primary structured data source. Viator embeds a
 *   Product+TouristTrip JSON-LD block with title, description, price, rating,
 *   reviews, itinerary, and images.
 *
 * SELECTORS: CSS selectors using data-automation attributes for DOM fallback
 *   when JSON-LD lacks a field.
 */

export const SELECTORS = {
  title: '[data-automation="product-title"], h1',
  description: '[data-automation="product-overview"]',
  inclusions: '[data-automation="whats-included-section"] li',
  cancellation: '[data-automation="cancellation-policy-text"]',
  operatorName: '[data-automation="pdp-tour-operator-name"]',
  itineraryItems: '[data-automation="itinerary-item-stop"]',
  productAttributes: '[data-automation="product-attributes-list"] li',
  reviewLink: '[data-automation="title-review-link"]',
  price: '[data-automation="tour-grade-price"]',
  photoGallery:
    '[data-automation^="gallery-image"] img, [data-automation="main-image"] img',
  departureReturn: '[data-automation="departure-return-section"]',
  additionalInfo: '[data-automation="additional-info-section"]',
  productCode: '[data-automation="product-code"]',
};

/**
 * Detect DataDome / captcha challenge pages.
 * Returns true if the HTML is a bot-protection challenge, not real content.
 */
export function isDataDomeChallenge(html: string): boolean {
  // Real Viator pages are large (100KB+) and include DataDome scripts normally.
  // A challenge page is small (<50KB) and has captcha as its main content.
  if (html.length > 50000) return false;
  return (
    html.includes("captcha-delivery.com") ||
    html.includes("geo.captcha-delivery.com") ||
    (html.includes("var dd=") && html.length < 3000)
  );
}
