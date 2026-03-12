import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses, adminEvents } from "@/lib/db/schema";
import { eq, sql, and, gte, ilike, desc, count } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const statusFilter = searchParams.get("status") || "all";
  const dataSourceFilter = searchParams.get("dataSource") || "all";
  const search = searchParams.get("search") || "";

  // Build filter conditions for analyses
  const conditions = [];
  if (statusFilter !== "all") {
    conditions.push(eq(analyses.status, statusFilter));
  }
  if (dataSourceFilter !== "all") {
    if (dataSourceFilter === "api-only") {
      // Include null (legacy rows) as api-only
      conditions.push(
        sql`(${analyses.dataSource} = 'api-only' OR ${analyses.dataSource} IS NULL)`
      );
    } else {
      conditions.push(eq(analyses.dataSource, dataSourceFilter));
    }
  }
  if (search) {
    conditions.push(ilike(analyses.viatorProductCode, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Run queries in parallel
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
  ]);

  const stats = statsResult[0];
  const total = totalResult[0].count;
  const todayCount = todayResult[0].count;
  const cacheEntries = Number((cacheResult as unknown as { count: number }[])[0]?.count ?? 0);

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
