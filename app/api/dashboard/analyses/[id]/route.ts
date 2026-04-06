import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminEvent } from "@/lib/admin/events";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership-scoped delete — only removes the row if it belongs to this user.
    const deleted = await db
      .delete(analyses)
      .where(and(eq(analyses.id, id), eq(analyses.userId, user.id)))
      .returning({ id: analyses.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    logAdminEvent("analysis_deleted", { analysisId: id, userId: user.id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete analysis error:", error);
    return NextResponse.json(
      { error: "Failed to delete analysis" },
      { status: 500 }
    );
  }
}
