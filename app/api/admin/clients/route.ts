import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, analyses } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const clients = await db
      .select({
        id: profiles.id,
        role: profiles.role,
        plan: profiles.plan,
        fullName: profiles.fullName,
        companyName: profiles.companyName,
        createdAt: profiles.createdAt,
        analysisCount: sql<number>`(SELECT count(*) FROM ${analyses} WHERE ${analyses.userId} = ${profiles.id})`,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt));

    // Fetch emails from Supabase auth
    const supabase = await createServerSupabaseClient();
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    if (users) {
      for (const u of users) {
        if (u.email) emailMap.set(u.id, u.email);
      }
    }

    const clientsWithEmail = clients.map((c) => ({
      ...c,
      email: emailMap.get(c.id) || null,
    }));

    return NextResponse.json({ clients: clientsWithEmail });
  } catch (error) {
    console.error("Admin clients error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

const VALID_ROLES = ["admin", "client"];
const VALID_PLANS = ["free", "growth", "pro"];

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { userId, role, plan } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (plan !== undefined && !VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (role === undefined && plan === undefined) {
      return NextResponse.json({ error: "Provide role or plan to update" }, { status: 400 });
    }

    const updateData: Record<string, string> = {};
    if (role !== undefined) updateData.role = role;
    if (plan !== undefined) updateData.plan = plan;

    const [updated] = await db
      .update(profiles)
      .set(updateData)
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
