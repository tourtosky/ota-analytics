/**
 * Debug script: run the Viator scraper on a single URL and inspect results.
 * Usage: npx tsx scripts/debug-scrape.ts "<viator-url>"
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { ViatorScraper } from "@/lib/scraping/viator/scraper";

const url = process.argv[2];
if (!url) {
  console.error("Usage: npx tsx scripts/debug-scrape.ts <viator-url>");
  process.exit(1);
}

console.log(`\n=== Debug Scrape ===`);
console.log(`URL: ${url}`);
console.log(`ZENROWS_API_KEY set: ${!!process.env["ZENROWS_API_KEY"]}`);
console.log();

const scraper = new ViatorScraper();

(async () => {
  const result = await scraper.scrape(url);

  if (result.error) {
    console.error(`\n❌ Scrape failed: ${result.error}`);
    process.exit(1);
  }

  if (!result.listing) {
    console.error("\n❌ No listing returned");
    process.exit(1);
  }

  const l = result.listing;
  console.log(`\n=== Scrape Results (cached=${result.cached}) ===`);
  console.log(`Title: ${l.title}`);
  console.log(`Description: ${l.description.substring(0, 200)}...`);
  console.log(`Rating: ${l.rating} (${l.reviewCount} reviews)`);
  console.log(`Price: ${l.price.amount} ${l.price.currency}`);
  console.log(`Duration: ${l.duration}`);
  console.log(`Photos: ${l.photoCount}`);
  console.log(`Highlights: ${l.highlights.length} items`);
  console.log(`Inclusions: ${l.inclusions.length} items`);
  console.log(`Exclusions: ${l.exclusions.length} items`);
  console.log(`Itinerary: ${l.itinerary.length} stops`);
  if (l.itinerary.length > 0) {
    l.itinerary.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ${s.name}: ${s.description.substring(0, 100)}`));
  }
  console.log(`Languages: ${l.languages.join(", ")}`);
  console.log(`Cancellation: ${l.cancellationPolicy}`);
  console.log(`Operator: ${l.operatorName}`);
  console.log(`Flags: ${l.flags.join(", ")}`);
  console.log(`Badges: ${l.badges.join(", ")}`);
  console.log(`Scrape success: ${l.scrapeSuccess}`);
  console.log(`Scrape errors: ${l.scrapeErrors.join(", ") || "none"}`);
  console.log(`\nDebug files saved to /tmp/viator-debug.html and /tmp/viator-nextdata.json`);
})();
