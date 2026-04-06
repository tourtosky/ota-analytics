// Listing discovery — for a given product, enumerate every public Viator
// category page (destination × tag combo) on which the product may appear
// and verify presence via /products/search.
//
// Server-only: imports logAdminEvent. Do NOT import from client components.

import pLimit from "p-limit";
import { viatorRequest } from "./client";
import { getDestinationById, getTagById, slugify } from "./taxonomy";
import { logAdminEvent } from "@/lib/admin/events";
import type {
  DiscoveredListing,
  ViatorProduct,
  ViatorProductSearchResponse,
  ViatorTag,
} from "./types";

const VERIFY_CONCURRENCY = 4;
// Cap on how many combos we'll verify against the API. Some products are
// tagged across many destinations × many categories; beyond this the extra
// calls aren't worth the latency cost in the analysis pipeline.
const MAX_COMBOS_TO_VERIFY = 60;
// Cap on listings we persist + show in the UI. Sorted verified-first.
const MAX_LISTINGS_RETURNED = 30;
const VERIFY_PAGE_SIZE = 50;

interface Combo {
  destinationId: string;
  tagId: string;
}

function extractTagId(tag: ViatorTag): string | null {
  if (typeof tag === "number") return String(tag);
  if (tag && typeof tag === "object" && "ref" in tag) return String(tag.ref);
  return null;
}

function buildListingUrl(
  destinationSlug: string,
  tagSlug: string,
  destinationId: string,
  tagId: string
): string {
  return `https://www.viator.com/${destinationSlug}-tours/${tagSlug}/d${destinationId}-tag${tagId}`;
}

/**
 * Discover every public Viator listing on which the given product may appear,
 * verifying presence via /products/search. Never throws — failures are logged
 * and the corresponding listing is returned with verified: false.
 *
 * Returns at most MAX_LISTINGS_RETURNED listings, verified ones first.
 */
export async function discoverListings(
  product: ViatorProduct
): Promise<DiscoveredListing[]> {
  const started = Date.now();

  const destinationIds = Array.from(
    new Set(
      (product.destinations ?? [])
        .map((d) => d?.ref)
        .filter((r): r is string => typeof r === "string" && r.length > 0)
    )
  );
  const tagIds = Array.from(
    new Set(
      (product.tags ?? [])
        .map(extractTagId)
        .filter((t): t is string => t !== null && t.length > 0)
    )
  );

  if (destinationIds.length === 0 || tagIds.length === 0) {
    logAdminEvent("listings_discovered", {
      productCode: product.productCode,
      combos: 0,
      verified: 0,
      returned: 0,
      reason: "no_destinations_or_tags",
      durationMs: Date.now() - started,
    });
    return [];
  }

  // Cartesian product. Primary destination × primary tag goes first so, if
  // we hit the combo cap, we still verify the most important pairing.
  const allCombos: Combo[] = [];
  for (const destinationId of destinationIds) {
    for (const tagId of tagIds) {
      allCombos.push({ destinationId, tagId });
    }
  }

  const combosToVerify = allCombos.slice(0, MAX_COMBOS_TO_VERIFY);
  const combosSkipped = allCombos.length - combosToVerify.length;

  const limit = pLimit(VERIFY_CONCURRENCY);
  const results = await Promise.all(
    combosToVerify.map((combo) =>
      limit(() => verifyCombo(product.productCode, combo))
    )
  );

  // Resolve names/slugs. Taxonomy loads once per process and is cached.
  const listings: DiscoveredListing[] = await Promise.all(
    results.map(async (result) => {
      const { destinationId, tagId, verified, totalInListing } = result;

      const [dest, tag] = await Promise.all([
        getDestinationById(destinationId),
        getTagById(tagId),
      ]);

      const destinationName = dest?.name ?? `Destination ${destinationId}`;
      const tagName = tag?.name ?? `Category ${tagId}`;
      const destinationSlug = dest?.slug ?? slugify(destinationName);
      const tagSlug = tag?.slug ?? slugify(tagName);

      return {
        destinationId,
        destinationName,
        destinationSlug,
        tagId,
        tagName,
        tagSlug,
        url: buildListingUrl(destinationSlug, tagSlug, destinationId, tagId),
        verified,
        totalInListing,
      };
    })
  );

  // Verified-first ordering, then truncate.
  listings.sort((a, b) => Number(b.verified) - Number(a.verified));
  const returned = listings.slice(0, MAX_LISTINGS_RETURNED);

  logAdminEvent("listings_discovered", {
    productCode: product.productCode,
    combos: allCombos.length,
    combosVerified: combosToVerify.length,
    combosSkipped,
    verified: returned.filter((l) => l.verified).length,
    returned: returned.length,
    durationMs: Date.now() - started,
  });

  return returned;
}

interface VerifyResult {
  destinationId: string;
  tagId: string;
  verified: boolean;
  totalInListing?: number;
}

async function verifyCombo(
  productCode: string,
  combo: Combo
): Promise<VerifyResult> {
  try {
    const response = await viatorRequest<ViatorProductSearchResponse>(
      "/products/search",
      {
        method: "POST",
        body: {
          filtering: {
            destination: combo.destinationId,
            tags: [Number(combo.tagId)],
          },
          currency: "USD",
          pagination: {
            offset: 0,
            limit: VERIFY_PAGE_SIZE,
          },
        },
      }
    );

    const verified = (response.products ?? []).some(
      (p) => p.productCode === productCode
    );

    return {
      destinationId: combo.destinationId,
      tagId: combo.tagId,
      verified,
      totalInListing: response.totalCount,
    };
  } catch (error) {
    logAdminEvent("listing_verify_failed", {
      productCode,
      destinationId: combo.destinationId,
      tagId: combo.tagId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      destinationId: combo.destinationId,
      tagId: combo.tagId,
      verified: false,
    };
  }
}
