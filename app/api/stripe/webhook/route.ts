import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPlanFromPriceId } from "@/lib/stripe/prices";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

async function getUserByStripeCustomerId(customerId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.stripeCustomerId, customerId))
    .limit(1);
  return profile ?? null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  console.log("[webhook] checkout.session.completed:", {
    customerId,
    subscriptionId,
    clientRefId: session.client_reference_id,
    metadata: session.metadata,
  });

  if (!subscriptionId || !customerId) {
    console.warn("[webhook] Missing subscriptionId or customerId, skipping");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  console.log("[webhook] subscription priceId:", priceId, "status:", subscription.status);

  if (!priceId) return;

  const plan = getPlanFromPriceId(priceId);
  console.log("[webhook] resolved plan:", plan);
  if (!plan) return;

  // Try to find user by Stripe customer ID first
  const profile = await getUserByStripeCustomerId(customerId);
  if (profile) {
    console.log("[webhook] Updating profile by stripeCustomerId:", profile.id);
    await db.update(profiles)
      .set({ plan })
      .where(eq(profiles.id, profile.id));
  } else if (session.client_reference_id) {
    // Fallback: use client_reference_id (Supabase user ID)
    console.log("[webhook] Updating profile by client_reference_id:", session.client_reference_id);
    await db.update(profiles)
      .set({ plan, stripeCustomerId: customerId })
      .where(eq(profiles.id, session.client_reference_id));
  } else {
    console.error("[webhook] Could not find user for customerId:", customerId);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  const priceId = subscription.items.data[0]?.price.id;

  console.log("[webhook] customer.subscription.updated:", { customerId, priceId, status: subscription.status });

  if (!priceId || !customerId) return;

  const plan = getPlanFromPriceId(priceId);
  if (!plan) return;

  const profile = await getUserByStripeCustomerId(customerId);
  if (profile) {
    await db.update(profiles)
      .set({ plan })
      .where(eq(profiles.id, profile.id));
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;

  console.log("[webhook] customer.subscription.deleted:", { customerId });

  if (!customerId) return;

  const profile = await getUserByStripeCustomerId(customerId);
  if (profile) {
    await db.update(profiles)
      .set({ plan: "free" })
      .where(eq(profiles.id, profile.id));
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  console.log("[webhook] Received event, signature present:", !!signature);

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[webhook] Event type:", event.type, "id:", event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        console.warn("[webhook] Payment failed for:", (event.data.object as Stripe.Invoice).customer);
        break;
      default:
        console.log("[webhook] Unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
