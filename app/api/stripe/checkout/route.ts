import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/auth/roles";
import { stripe } from "@/lib/stripe";
import { STRIPE_PRICES } from "@/lib/stripe/prices";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, interval } = body as { plan: string; interval: string };

    if (!plan || !interval) {
      return NextResponse.json({ error: "Missing plan or interval" }, { status: 400 });
    }

    if (plan !== "growth" && plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (interval !== "monthly" && interval !== "yearly") {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }

    const priceId = STRIPE_PRICES[plan][interval];
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    // Get or create profile, then get/create Stripe customer
    const profile = await getOrCreateProfile(user.id, user.email);
    let customerId = profile.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabaseUserId: user.id },
      });
      customerId = customer.id;

      await db.update(profiles)
        .set({ stripeCustomerId: customerId })
        .where(eq(profiles.id, user.id));
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: user.id, plan },
      },
      metadata: { userId: user.id, plan },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
