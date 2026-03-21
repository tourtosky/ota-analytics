import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await db
      .select({
        id: analyses.id,
        viatorProductCode: analyses.viatorProductCode,
        productTitle: analyses.productTitle,
        status: analyses.status,
        overallScore: analyses.overallScore,
        scores: analyses.scores,
        createdAt: analyses.createdAt,
        completedAt: analyses.completedAt,
        progress: analyses.progress,
      })
      .from(analyses)
      .where(eq(analyses.userId, user.id))
      .orderBy(desc(analyses.createdAt));

    return NextResponse.json({ analyses: items, total: items.length });
  } catch (error) {
    console.error("Dashboard analyses error:", error);
    return NextResponse.json({ error: "Failed to fetch analyses" }, { status: 500 });
  }
}
