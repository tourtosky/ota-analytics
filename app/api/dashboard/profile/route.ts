import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/auth/roles";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getOrCreateProfile(user.id, user.email);

    return NextResponse.json({
      email: user.email,
      fullName: profile.fullName,
      companyName: profile.companyName,
      plan: profile.plan,
      createdAt: profile.createdAt,
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { fullName, companyName } = body;

    // Validate
    if (fullName !== undefined && typeof fullName === "string" && fullName.length > 100) {
      return NextResponse.json({ error: "Full name must be 100 characters or less" }, { status: 400 });
    }
    if (companyName !== undefined && typeof companyName === "string" && companyName.length > 100) {
      return NextResponse.json({ error: "Company name must be 100 characters or less" }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};
    if (fullName !== undefined) updates.fullName = fullName || null;
    if (companyName !== undefined) updates.companyName = companyName || null;

    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, user.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      fullName: updated.fullName,
      companyName: updated.companyName,
      plan: updated.plan,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
