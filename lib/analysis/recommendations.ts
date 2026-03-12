import Anthropic from "@anthropic-ai/sdk";
import { logAdminEvent } from "@/lib/admin/events";
import {
  ViatorProduct,
  CompetitorData,
  ViatorReview,
  AIRecommendation,
  ReviewInsight,
} from "../viator/types";

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * Generate AI-powered recommendations for improving the listing
 */
export async function generateRecommendations(
  product: ViatorProduct,
  competitors: CompetitorData[],
  operatorReviews: ViatorReview[],
  competitorReviews: ViatorReview[]
): Promise<AIRecommendation[]> {
  // Build competitor summary
  const competitorSummary = competitors
    .slice(0, 8)
    .map(
      (c) =>
        `- ${c.title} | ⭐${c.rating} (${c.reviewCount} reviews) | ${c.currency}${c.price} | ${c.photoCount} photos${c.flags?.length ? ` | Flags: ${c.flags.join(", ")}` : ""}`
    )
    .join("\n");

  // Build negative reviews summary
  const negativeReviews = operatorReviews
    .filter((r) => r.rating <= 3)
    .slice(0, 5)
    .map((r) => `- ${r.rating}⭐: ${r.text.slice(0, 200)}`)
    .join("\n");

  // Build competitor review highlights
  const competitorPositives = competitorReviews
    .filter((r) => r.rating >= 4)
    .slice(0, 10)
    .map((r) => r.text.slice(0, 150))
    .join(" ");

  const competitorNegatives = competitorReviews
    .filter((r) => r.rating <= 3)
    .slice(0, 5)
    .map((r) => r.text.slice(0, 150))
    .join(" ");

  const systemPrompt = `You are a Viator listing optimization expert. Analyze the tour operator's listing compared to their top competitors and provide specific, actionable recommendations to improve their ranking and bookings on Viator.

Be data-driven: reference specific numbers, percentages, and competitor examples.
Be specific: instead of "improve your title", say "Add 'Private' and 'Skip-the-Line' to your title — 6 of 8 top competitors use these keywords."
Prioritize by impact: order recommendations from highest to lowest expected impact on bookings.

Return your response as a JSON array of recommendations. Each recommendation should have:
- priority: "critical" | "high" | "medium"
- category: one of "title" | "description" | "pricing" | "photos" | "reviews" | "completeness"
- title: A brief, action-oriented title (10 words max)
- description: Detailed explanation with data (2-3 sentences)
- impact: Expected impact on bookings (1 sentence)

Return ONLY the JSON array, no other text.`;

  const userMessage = `## Operator's Product
Title: ${product.title}
Rating: ${product.reviews?.combinedAverageRating || "N/A"} (${product.reviews?.totalReviews || 0} reviews)
Price: ${product.pricing?.currency || "USD"}${product.pricing?.summary?.fromPrice || product.pricing?.price || "N/A"}
Photos: ${product.images?.length || 0}
Description length: ${product.description ? product.description.split(/\s+/).length : 0} words
Inclusions: ${product.inclusions?.length || 0} items
Exclusions: ${product.exclusions?.length || 0} items
Itinerary: ${product.itinerary?.itineraryItems?.length || 0} items
Flags: ${product.flags?.join(", ") || "none"}

## Top Competitors (same location + category)
${competitorSummary}

${negativeReviews ? `## Operator's Recent Reviews (negative/neutral)\n${negativeReviews}\n` : ""}

## Competitor Review Highlights
Positive themes: ${competitorPositives || "No positive reviews available"}
Complaints: ${competitorNegatives || "No negative reviews available"}

Provide 5-7 specific recommendations as a JSON array.`;

  try {
    const anthropic = getAnthropicClient();
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: systemPrompt + "\n\n" + userMessage,
        },
      ],
    });
    logAdminEvent("api_call", {
      service: "anthropic",
      endpoint: "messages",
      durationMs: Date.now() - startTime,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude API");
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON array in Claude response");
    }

    const recommendations: AIRecommendation[] = JSON.parse(jsonMatch[0]);
    return recommendations;
  } catch (error) {
    console.error("Error generating recommendations:", error);
    // Return fallback recommendations
    return [
      {
        priority: "high",
        category: "photos",
        title: "Add more photos to your listing",
        description: `You have ${product.images.length} photos. Consider adding more high-quality images to showcase your tour.`,
        impact: "Listings with 9+ photos typically see higher engagement.",
      },
    ];
  }
}

/**
 * Generate review insights using AI
 */
export async function generateReviewInsights(
  operatorReviews: ViatorReview[],
  competitorReviews: ViatorReview[]
): Promise<ReviewInsight> {
  const operatorReviewText = operatorReviews
    .slice(0, 20)
    .map((r) => `${r.rating}⭐: ${r.text}`)
    .join("\n");

  const competitorReviewText = competitorReviews
    .slice(0, 30)
    .map((r) => `${r.rating}⭐: ${r.text}`)
    .join("\n");

  const systemPrompt = `Analyze these reviews for a Viator tour and its competitors.

Return your response as a JSON object with:
- positives: array of {theme: string, frequency: number} - top 5 things travelers praise about competitors
- negatives: array of {theme: string, frequency: number} - top 5 complaints about competitors (operator's opportunities)
- sentiment: "improving" | "stable" | "declining" - operator's trend
- keyPhrases: array of strings - key phrases from 5-star reviews to use in marketing
- opportunities: array of strings - unmet needs mentioned by travelers

Return ONLY the JSON object, no other text.`;

  const userMessage = `OPERATOR REVIEWS:
${operatorReviewText || "No reviews available"}

COMPETITOR REVIEWS:
${competitorReviewText || "No competitor reviews available"}

Provide the analysis as a JSON object.`;

  try {
    const anthropic = getAnthropicClient();
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: systemPrompt + "\n\n" + userMessage,
        },
      ],
    });
    logAdminEvent("api_call", {
      service: "anthropic",
      endpoint: "messages",
      durationMs: Date.now() - startTime,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude API");
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON object in Claude response");
    }

    const insights: ReviewInsight = JSON.parse(jsonMatch[0]);
    return insights;
  } catch (error) {
    console.error("Error generating review insights:", error);
    // Return fallback insights
    return {
      positives: [],
      negatives: [],
      sentiment: "stable",
      keyPhrases: [],
      opportunities: [],
    };
  }
}
