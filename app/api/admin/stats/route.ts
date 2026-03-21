import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses, adminEvents } from "@/lib/db/schema";
import { eq, sql, and, gte, ilike, desc, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-guard";

const PAGE_SIZE = 20;

function getTimeRangeStart(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const statusFilter = searchParams.get("status") || "all";
  const dataSourceFilter = searchParams.get("dataSource") || "all";
  const search = searchParams.get("search") || "";
  const timeRange = searchParams.get("timeRange") || "all";

  // Build filter conditions for analyses
  const conditions = [];
  if (statusFilter !== "all") {
    conditions.push(eq(analyses.status, statusFilter));
  }
  if (dataSourceFilter !== "all") {
    if (dataSourceFilter === "api-only") {
      conditions.push(
        sql`(${analyses.dataSource} = 'api-only' OR ${analyses.dataSource} IS NULL)`
      );
    } else {
      conditions.push(eq(analyses.dataSource, dataSourceFilter));
    }
  }
  if (search) {
    conditions.push(
      sql`(${ilike(analyses.viatorProductCode, `%${search}%`)} OR ${ilike(analyses.productTitle, `%${search}%`)})`
    );
  }

  const timeRangeStart = getTimeRangeStart(timeRange);
  if (timeRangeStart) {
    conditions.push(gte(analyses.createdAt, timeRangeStart));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartISO = todayStart.toISOString();

  const [
    statsResult,
    analysisItems,
    totalResult,
    todayResult,
    cacheResult,
    scrapingEvents,
    apiEvents,
    recentScrapingEvents,
    recentApiEvents,
    scoreDistResult,
    avgProcessingResult,
  ] = await Promise.all([
    // Aggregate stats
    db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${analyses.status} = 'completed')`,
        failed: sql<number>`count(*) filter (where ${analyses.status} = 'failed')`,
        avgScore: sql<number>`round(avg(${analyses.overallScore}))`,
      })
      .from(analyses),

    // Paginated analyses list
    db
      .select({
        id: analyses.id,
        viatorProductCode: analyses.viatorProductCode,
        productTitle: analyses.productTitle,
        status: analyses.status,
        overallScore: analyses.overallScore,
        dataSource: analyses.dataSource,
        competitorCount: sql<number>`jsonb_array_length(coalesce(${analyses.competitorsData}, '[]'::jsonb))`,
        createdAt: analyses.createdAt,
        completedAt: analyses.completedAt,
      })
      .from(analyses)
      .where(whereClause)
      .orderBy(desc(analyses.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    // Total count for pagination (with filters)
    db
      .select({ count: count() })
      .from(analyses)
      .where(whereClause),

    // Today's count
    db
      .select({ count: count() })
      .from(analyses)
      .where(gte(analyses.createdAt, todayStart)),

    // Cache entries count
    db.execute(sql`SELECT count(*) as count FROM scraped_pages`),

    // Scraping event aggregates
    db
      .select({
        event: adminEvents.event,
        count: count(),
      })
      .from(adminEvents)
      .where(sql`${adminEvents.event} LIKE 'scrape_%'`)
      .groupBy(adminEvents.event),

    // API event aggregates
    db.execute(sql`
      SELECT
        (metadata->>'service') as service,
        count(*) as total,
        count(*) filter (where ${adminEvents.createdAt} >= ${todayStartISO}::timestamp) as today
      FROM admin_events
      WHERE event = 'api_call'
      GROUP BY metadata->>'service'
    `),

    // Recent scraping events (last 50)
    db
      .select()
      .from(adminEvents)
      .where(sql`${adminEvents.event} LIKE 'scrape_%'`)
      .orderBy(desc(adminEvents.createdAt))
      .limit(50),

    // Recent API events (last 50)
    db
      .select()
      .from(adminEvents)
      .where(eq(adminEvents.event, "api_call"))
      .orderBy(desc(adminEvents.createdAt))
      .limit(50),

    // Score distribution (5 buckets: 0-20, 21-40, 41-60, 61-80, 81-100)
    db.execute(sql`
      SELECT
        count(*) filter (where ${analyses.overallScore} between 0 and 20) as bucket_0_20,
        count(*) filter (where ${analyses.overallScore} between 21 and 40) as bucket_21_40,
        count(*) filter (where ${analyses.overallScore} between 41 and 60) as bucket_41_60,
        count(*) filter (where ${analyses.overallScore} between 61 and 80) as bucket_61_80,
        count(*) filter (where ${analyses.overallScore} between 81 and 100) as bucket_81_100
      FROM analyses
      WHERE ${analyses.overallScore} IS NOT NULL
    `),

    // Average processing time from admin events
    db.execute(sql`
      SELECT round(avg((metadata->>'durationMs')::numeric)) as avg_ms
      FROM admin_events
      WHERE event = 'analysis_completed'
        AND metadata->>'durationMs' IS NOT NULL
    `),
  ]);

  const stats = statsResult[0];
  const total = totalResult[0].count;
  const todayCount = todayResult[0].count;
  const cacheEntries = Number((cacheResult as unknown as { count: number }[])[0]?.count ?? 0);

  // Score distribution
  const distRow = (scoreDistResult as unknown as Record<string, unknown>[])[0] || {};
  const scoreDistribution = [
    Number(distRow.bucket_0_20 ?? 0),
    Number(distRow.bucket_21_40 ?? 0),
    Number(distRow.bucket_41_60 ?? 0),
    Number(distRow.bucket_61_80 ?? 0),
    Number(distRow.bucket_81_100 ?? 0),
  ];

  // Avg processing time
  const avgRow = (avgProcessingResult as unknown as { avg_ms: number | null }[])[0];
  const avgProcessingTime = avgRow?.avg_ms ? Number(avgRow.avg_ms) : null;

  // Build scraping summary
  const scrapeMap = Object.fromEntries(
    scrapingEvents.map((e) => [e.event, Number(e.count)])
  );
  const totalScrapeAttempts =
    (scrapeMap["scrape_success"] || 0) +
    (scrapeMap["scrape_blocked"] || 0);

  // Build API summary
  const apiMap: Record<string, { total: number; today: number }> = {};
  for (const row of apiEvents as unknown as { service: string; total: number; today: number }[]) {
    apiMap[row.service] = {
      total: Number(row.total),
      today: Number(row.today),
    };
  }

  const successRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const scrapeSuccessRate = totalScrapeAttempts > 0
    ? Math.round(((scrapeMap["scrape_success"] || 0) / totalScrapeAttempts) * 100)
    : 0;

  return NextResponse.json({
    stats: {
      totalAnalyses: stats.total,
      completedCount: stats.completed,
      failedCount: stats.failed,
      successRate,
      avgScore: stats.avgScore || 0,
      todayCount,
      scrapeSuccessRate,
      cacheEntries,
      scoreDistribution,
      avgProcessingTime,
    },
    analyses: {
      items: analysisItems,
      total,
      page,
      pageSize: PAGE_SIZE,
    },
    events: {
      scraping: {
        totalAttempts: totalScrapeAttempts,
        successCount: scrapeMap["scrape_success"] || 0,
        blockedCount: scrapeMap["scrape_blocked"] || 0,
        cacheHitCount: scrapeMap["scrape_cache_hit"] || 0,
        recentEvents: recentScrapingEvents,
      },
      api: {
        viatorCallsToday: apiMap["viator"]?.today || 0,
        viatorCallsTotal: apiMap["viator"]?.total || 0,
        anthropicCallsToday: apiMap["anthropic"]?.today || 0,
        anthropicCallsTotal: apiMap["anthropic"]?.total || 0,
        recentEvents: recentApiEvents,
      },
    },
  });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
