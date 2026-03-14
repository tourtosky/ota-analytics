import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchProduct, searchCompetitors, formatCompetitorData, getSearchResultPrice, fetchProductPrice } from "@/lib/viator/products";
import { fetchReviews } from "@/lib/viator/reviews";
import { calculateScores } from "@/lib/analysis/scoring";
import { mergeProductData } from "@/lib/scraping/merge";
import { logAdminEvent } from "@/lib/admin/events";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productCode } = body;

    if (!productCode) {
      return NextResponse.json(
        { error: "Product code is required" },
        { status: 400 }
      );
    }

    // Create initial analysis record
    const [analysis] = await db
      .insert(analyses)
      .values({
        viatorProductCode: productCode,
        status: "processing",
      })
      .returning();

    logAdminEvent("analysis_started", {
      productCode,
      analysisId: analysis.id,
    });

    // Start processing asynchronously (don't await)
    processAnalysis(analysis.id, productCode).catch(async (error) => {
      console.error("Error processing analysis:", error);
      await db.update(analyses)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(analyses.id, analysis.id));
      logAdminEvent("analysis_failed", {
        analysisId: analysis.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return NextResponse.json({ analysisId: analysis.id });
  } catch (error) {
    console.error("Error starting analysis:", error);
    return NextResponse.json(
      { error: "Failed to start analysis" },
      { status: 500 }
    );
  }
}

async function updateProgress(analysisId: string, step: string, percent: number, message: string) {
  await db.update(analyses).set({ progress: { step, percent, message } }).where(eq(analyses.id, analysisId));
}

/**
 * Express analysis pipeline — Viator API only (no scraping, no AI).
 * Delivers scores + competitor data in ~5-8 seconds.
 * AI recommendations & review insights are left null (shown as blurred/locked on the frontend).
 */
async function processAnalysis(analysisId: string, productCode: string) {
  try {
    const pipelineStart = Date.now();

    // 1. Fetch the product
    await updateProgress(analysisId, "fetching_product", 10, "Fetching your listing from Viator...");
    console.log(`Fetching product: ${productCode}`);
    let viatorStart = Date.now();
    const product = await fetchProduct(productCode);
    logAdminEvent("api_call", { service: "viator", endpoint: `/products/${productCode}`, durationMs: Date.now() - viatorStart });

    // Get primary destination and tag
    const primaryDestination = product.destinations?.[0]?.ref;
    const primaryTag = product.tags?.[0];
    const primaryTagRef = typeof primaryTag === 'number'
      ? primaryTag.toString()
      : (primaryTag as any)?.ref;

    if (!primaryDestination || !primaryTagRef) {
      throw new Error(
        `Product missing destination or category information. ` +
        `Destinations: ${product.destinations?.length || 0}, Tags: ${product.tags?.length || 0}`
      );
    }

    // 2. Find competitors + pricing
    await updateProgress(analysisId, "finding_competitors", 30, "Searching for top competitors...");
    viatorStart = Date.now();
    const { competitors: competitorResults, operatorSearchResult } = await searchCompetitors(
      primaryDestination,
      primaryTagRef,
      productCode,
      10
    );
    logAdminEvent("api_call", { service: "viator", endpoint: "/search/products", durationMs: Date.now() - viatorStart });

    // Enrich pricing
    if (operatorSearchResult) {
      const operatorPrice = getSearchResultPrice(operatorSearchResult);
      product.pricing = {
        ...product.pricing,
        summary: { fromPrice: operatorPrice.price },
        currency: operatorPrice.currency,
      };
    } else {
      const operatorPrice = await fetchProductPrice(productCode);
      product.pricing = {
        ...product.pricing,
        summary: { fromPrice: operatorPrice.price },
        currency: operatorPrice.currency,
      };
    }

    const competitors = await formatCompetitorData(competitorResults);

    // 3. Fetch reviews (operator + top 3 competitors)
    await updateProgress(analysisId, "fetching_reviews", 55, "Analyzing reviews...");
    const operatorReviews = await fetchReviews(productCode, 20);
    const competitorReviewsArrays = await Promise.all(
      competitors.slice(0, 3).map((c) => fetchReviews(c.productCode, 20))
    );
    const competitorReviews = competitorReviewsArrays.flat();

    // 4. Calculate scores (API-only data, no scrape enrichment)
    await updateProgress(analysisId, "calculating_scores", 80, "Crunching the numbers...");
    const mergedProduct = mergeProductData(product, null); // API-only
    const scores = calculateScores(mergedProduct, competitors);

    const safeScore = (v: number) => (Number.isFinite(v) ? v : 0);
    scores.title = safeScore(scores.title);
    scores.description = safeScore(scores.description);
    scores.pricing = safeScore(scores.pricing);
    scores.reviews = safeScore(scores.reviews);
    scores.photos = safeScore(scores.photos);
    scores.completeness = safeScore(scores.completeness);
    scores.overall = safeScore(scores.overall);

    // 5. Save — no AI recommendations or review insights (shown blurred on frontend)
    await updateProgress(analysisId, "saving", 95, "Finalizing your report...");
    await db
      .update(analyses)
      .set({
        productTitle: mergedProduct.title,
        status: "completed",
        overallScore: scores.overall,
        scores: {
          title: scores.title,
          description: scores.description,
          pricing: scores.pricing,
          reviews: scores.reviews,
          photos: scores.photos,
          completeness: scores.completeness,
        },
        productData: mergedProduct as unknown as Record<string, unknown>,
        competitorsData: competitors as any,
        recommendations: null,
        reviewInsights: null,
        completedAt: new Date(),
        dataSource: "api-only",
      })
      .where(eq(analyses.id, analysisId));

    console.log(`Express analysis ${analysisId} completed in ${Date.now() - pipelineStart}ms`);
    logAdminEvent("analysis_completed", {
      analysisId,
      score: scores.overall,
      dataSource: "api-only",
      durationMs: Date.now() - pipelineStart,
    });
  } catch (error) {
    console.error(`Error processing analysis ${analysisId}:`, error);
    throw error;
  }
}
