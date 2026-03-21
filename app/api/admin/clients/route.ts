import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, analyses } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    // Query profiles with analysis count per user
    const clients = await db
      .select({
        id: profiles.id,
        role: profiles.role,
        fullName: profiles.fullName,
        companyName: profiles.companyName,
        createdAt: profiles.createdAt,
        analysisCount: sql<number>`(SELECT count(*) FROM ${analyses} WHERE ${analyses.userId} = ${profiles.id})`,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt));

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Admin clients error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !["admin", "client"].includes(role)) {
      return NextResponse.json({ error: "Invalid userId or role" }, { status: 400 });
    }

    const [updated] = await db
      .update(profiles)
      .set({ role })
      .where(eq(profiles.id, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error("Admin clients PATCH error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
