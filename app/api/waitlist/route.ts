import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { email, name, platform, listingCount } = await req.json();

    if (!email || !name || !platform || !listingCount) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    await db.insert(waitlist).values({ email, name, platform, listingCount });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "This email is already on the waitlist" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}
