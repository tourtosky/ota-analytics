// Viator taxonomy helpers — resolves destination and tag IDs to human-readable
// names and URL slugs. Server-only: imports logAdminEvent.
//
// Both endpoints return large static lists (thousands of destinations, hundreds
// of tags) so we fetch once per process and cache in-memory for the lifetime
// of the server. Admin events are logged on every cold fetch so we can measure
// impact and decide whether to add a persistent TTL cache later.

import { viatorRequest } from "./client";
import { logAdminEvent } from "@/lib/admin/events";

interface DestinationEntry {
  name: string;
  slug: string;
}

interface TagEntry {
  name: string;
  slug: string;
}

// Raw shapes as returned by Viator Partner API v2.0. Fields we don't use are
// left loose on purpose.
interface RawDestination {
  destinationId: number | string;
  name?: string;
  type?: string;
}

interface RawTag {
  tagId: number | string;
  allNamesByLocale?: Record<string, string>;
  parentTagIds?: number[];
}

let destinationsPromise: Promise<Map<string, DestinationEntry>> | null = null;
let tagsPromise: Promise<Map<string, TagEntry>> | null = null;

/**
 * Convert a human name like "Canal Cruises" into a Viator-style URL slug
 * like "Canal-Cruises". Viator uses PascalCase words joined by hyphens; the
 * slug does not need to be exact for navigation, because Viator redirects
 * any slug to canonical as long as d{destId}-tag{tagId} is correct.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // strip punctuation but keep unicode letters
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}

async function loadDestinations(): Promise<Map<string, DestinationEntry>> {
  const started = Date.now();
  try {
    const response = await viatorRequest<{ destinations: RawDestination[] }>(
      "/destinations"
    );
    const map = new Map<string, DestinationEntry>();
    for (const d of response.destinations ?? []) {
      const id = String(d.destinationId);
      const name = d.name ?? id;
      map.set(id, { name, slug: slugify(name) });
    }
    logAdminEvent("taxonomy_fetch", {
      kind: "destinations",
      count: map.size,
      durationMs: Date.now() - started,
      cold: true,
    });
    return map;
  } catch (error) {
    logAdminEvent("taxonomy_fetch_failed", {
      kind: "destinations",
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    });
    // Return empty map so callers fall back to id-based slugs instead of
    // blocking the entire analysis pipeline.
    return new Map();
  }
}

async function loadTags(): Promise<Map<string, TagEntry>> {
  const started = Date.now();
  try {
    const response = await viatorRequest<{ tags: RawTag[] }>("/products/tags");
    const map = new Map<string, TagEntry>();
    for (const t of response.tags ?? []) {
      const id = String(t.tagId);
      const name =
        t.allNamesByLocale?.en ??
        t.allNamesByLocale?.["en-US"] ??
        Object.values(t.allNamesByLocale ?? {})[0] ??
        id;
      map.set(id, { name, slug: slugify(name) });
    }
    logAdminEvent("taxonomy_fetch", {
      kind: "tags",
      count: map.size,
      durationMs: Date.now() - started,
      cold: true,
    });
    return map;
  } catch (error) {
    logAdminEvent("taxonomy_fetch_failed", {
      kind: "tags",
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    });
    return new Map();
  }
}

export async function getDestinationById(
  id: string
): Promise<DestinationEntry | null> {
  if (!destinationsPromise) destinationsPromise = loadDestinations();
  const map = await destinationsPromise;
  return map.get(String(id)) ?? null;
}

export async function getTagById(id: string): Promise<TagEntry | null> {
  if (!tagsPromise) tagsPromise = loadTags();
  const map = await tagsPromise;
  return map.get(String(id)) ?? null;
}
