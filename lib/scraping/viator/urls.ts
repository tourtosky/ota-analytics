/**
 * Build a short-form Viator product URL from destination ref and product code.
 * Viator redirects this to the full canonical URL automatically.
 *
 * Example: buildViatorUrl("687", "5678P1")
 *   → "https://www.viator.com/tours/d687-5678P1"
 */
export function buildViatorUrl(
  destinationRef: string,
  productCode: string
): string {
  return `https://www.viator.com/tours/d${destinationRef}-${productCode}`;
}

/**
 * Extract product code from a Viator URL.
 * Handles both full and short-form URLs.
 * Requires at least 4 alphanumeric chars after the dash to avoid false matches.
 *
 * Examples:
 *   "https://www.viator.com/tours/d687-5678P1" → "5678P1"
 *   "https://www.viator.com/tours/New-York/Tour/d687-5678P1" → "5678P1"
 */
export function extractViatorProductCode(url: string): string | null {
  const match = url.match(/d\d+-([A-Z0-9]{4,})/i);
  return match ? match[1].toUpperCase() : null;
}
