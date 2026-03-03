import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchProduct, searchCompetitors, formatCompetitorData, getSearchResultPrice, fetchProductPrice } from "@/lib/viator/products";
import { fetchReviews } from "@/lib/viator/reviews";
import { calculateScores } from "@/lib/analysis/scoring";
import { generateRecommendations, generateReviewInsights } from "@/lib/analysis/recommendations";

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

    // Start processing asynchronously (don't await)
    processAnalysis(analysis.id, productCode).catch((error) => {
      console.error("Error processing analysis:", error);
      // Update status to failed
      db.update(analyses)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(analyses.id, analysis.id));
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

/**
 * Process the analysis asynchronously
 */
async function processAnalysis(analysisId: string, productCode: string) {
  try {
    // 1. Fetch the product
    console.log(`Fetching product: ${productCode}`);
    const product = await fetchProduct(productCode);
    console.log(`Product fetched:`, {
      title: product.title,
      destinations: product.destinations,
      tags: product.tags,
    });

    // Get primary destination and tag
    const primaryDestination = product.destinations?.[0]?.ref;
    // Tags can be numbers or objects - handle both
    const primaryTag = product.tags?.[0];
    const primaryTagRef = typeof primaryTag === 'number'
      ? primaryTag.toString()
      : (primaryTag as any)?.ref;

    if (!primaryDestination || !primaryTagRef) {
      console.error("Product data structure:", JSON.stringify(product, null, 2));
      throw new Error(
        `Product missing destination or category information. ` +
        `Destinations: ${product.destinations?.length || 0}, Tags: ${product.tags?.length || 0}`
      );
    }

    console.log(`Using destination: ${primaryDestination}, tag: ${primaryTagRef}`);

    // 2. Find competitors (also returns operator's search result for pricing)
    const { competitors: competitorResults, operatorSearchResult } = await searchCompetitors(
      primaryDestination,
      primaryTagRef,
      productCode,
      10
    );

    console.log(`Found ${competitorResults.length} competitor products`);

    // Enrich operator product with pricing
    // (full product endpoint doesn't include fromPrice)
    if (operatorSearchResult) {
      const operatorPrice = getSearchResultPrice(operatorSearchResult);
      product.pricing = {
        ...product.pricing,
        summary: { fromPrice: operatorPrice.price },
        currency: operatorPrice.currency,
      };
    } else {
      // Product not in search results - fetch price via availability check
      console.log("Operator not in search results, fetching price via availability check");
      const operatorPrice = await fetchProductPrice(productCode);
      product.pricing = {
        ...product.pricing,
        summary: { fromPrice: operatorPrice.price },
        currency: operatorPrice.currency,
      };
    }

    const competitors = await formatCompetitorData(competitorResults);
    console.log(`Formatted ${competitors.length} competitors with complete data`);

    // 3. Fetch reviews (operator + top 3 competitors)
    const operatorReviews = await fetchReviews(productCode, 20);

    const competitorReviewsPromises = competitors
      .slice(0, 3)
      .map((c) => fetchReviews(c.productCode, 20));

    const competitorReviewsArrays = await Promise.all(competitorReviewsPromises);
    const competitorReviews = competitorReviewsArrays.flat();

    // 4. Calculate scores
    const scores = calculateScores(product, competitors);

    // 5. Generate AI recommendations (parallel)
    const [recommendations, reviewInsights] = await Promise.all([
      generateRecommendations(product, competitors, operatorReviews, competitorReviews),
      generateReviewInsights(operatorReviews, competitorReviews),
    ]);

    // 6. Update analysis with results
    await db
      .update(analyses)
      .set({
        productTitle: product.title,
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
        productData: product as any,
        competitorsData: competitors as any,
        recommendations: recommendations as any,
        reviewInsights: reviewInsights as any,
        completedAt: new Date(),
      })
      .where(eq(analyses.id, analysisId));

    console.log(`Analysis ${analysisId} completed successfully`);
  } catch (error) {
    console.error(`Error processing analysis ${analysisId}:`, error);
    throw error;
  }
}
