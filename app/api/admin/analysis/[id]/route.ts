import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, id))
      .limit(1);

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error fetching analysis detail:", error);
    return NextResponse.json({ error: "Failed to fetch analysis" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(analyses)
      .where(eq(analyses.id, id))
      .returning({ id: analyses.id });

    if (!deleted) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting analysis:", error);
    return NextResponse.json({ error: "Failed to delete analysis" }, { status: 500 });
  }
}
