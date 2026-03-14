import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/auth/roles";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getOrCreateProfile(user.id, user.email);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: profile.role,
    fullName: profile.fullName,
    companyName: profile.companyName,
  });
}
