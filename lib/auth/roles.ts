import { db } from "@/lib/db";
import { profiles, Profile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "client";

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return profile ?? null;
}

export async function getOrCreateProfile(userId: string, email?: string): Promise<Profile> {
  const existing = await getUserProfile(userId);
  if (existing) return existing;

  // Auto-create profile as client by default
  const [created] = await db
    .insert(profiles)
    .values({
      id: userId,
      role: "client",
      fullName: email?.split("@")[0] || null,
    })
    .returning();

  return created;
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const profile = await getUserProfile(userId);
  return profile?.role ?? "client";
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await db
    .update(profiles)
    .set({ role })
    .where(eq(profiles.id, userId));
}
