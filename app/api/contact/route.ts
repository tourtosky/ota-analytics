import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { name, email, message } = await request.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Log for now — email sending can be added later
  console.log("[contact]", { name, email, message, receivedAt: new Date().toISOString() });

  return NextResponse.json({ ok: true });
}
