import { db } from "@/lib/db";
import { adminEvents } from "@/lib/db/schema";

/**
 * Log an admin event. Fire-and-forget — never blocks the caller.
 * Call WITHOUT await at call sites.
 *
 * IMPORTANT: Only import this in server-side code (API routes, server actions).
 * Do NOT import in files that are part of client component import chains
 * (e.g., lib/viator/client.ts is imported by CompetitorTable.tsx).
 */
export function logAdminEvent(
  event: string,
  metadata: Record<string, unknown>
): void {
  db.insert(adminEvents)
    .values({ event, metadata })
    .then(() => {})
    .catch((err) => {
      console.error(`[admin-events] Failed to log ${event}:`, err);
    });
}
