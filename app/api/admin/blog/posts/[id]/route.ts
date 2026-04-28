import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, type NewBlogPost } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { calculateReadingTime, isBlogPostStatus, slugify } from "@/lib/blog";
import { logAdminEvent } from "@/lib/admin/events";

async function getUniqueSlug(baseSlug: string, postId: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, candidate), ne(blogPosts.id, postId)))
      .limit(1);

    if (!existing) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Admin blog detail error:", error);
    return NextResponse.json({ error: "Failed to load blog post" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const updates: Partial<NewBlogPost> = { updatedAt: new Date() };

    if (body.title !== undefined) {
      const title = cleanString(body.title);
      if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
      updates.title = title;
    }

    if (body.slug !== undefined) {
      const baseSlug = slugify(cleanString(body.slug));
      if (!baseSlug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });
      updates.slug = await getUniqueSlug(baseSlug, id);
    }

    if (body.excerpt !== undefined) {
      const excerpt = cleanString(body.excerpt);
      if (!excerpt) return NextResponse.json({ error: "Excerpt is required" }, { status: 400 });
      updates.excerpt = excerpt;
    }

    if (body.contentMarkdown !== undefined) {
      const contentMarkdown = cleanString(body.contentMarkdown);
      if (!contentMarkdown) return NextResponse.json({ error: "Content is required" }, { status: 400 });
      updates.contentMarkdown = contentMarkdown;
      updates.readingTime = calculateReadingTime(contentMarkdown);
    }

    if (body.category !== undefined) {
      updates.category = (cleanString(body.category) || "Guides").slice(0, 80);
    }

    if (body.coverImageUrl !== undefined) {
      updates.coverImageUrl = cleanOptionalString(body.coverImageUrl);
    }

    if (body.metaTitle !== undefined) {
      updates.metaTitle = cleanOptionalString(body.metaTitle);
    }

    if (body.metaDescription !== undefined) {
      updates.metaDescription = cleanOptionalString(body.metaDescription);
    }

    if (body.status !== undefined) {
      if (!isBlogPostStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      updates.status = body.status;
      updates.publishedAt = body.status === "published"
        ? existing.publishedAt ?? new Date()
        : null;
    }

    const [updated] = await db
      .update(blogPosts)
      .set(updates)
      .where(eq(blogPosts.id, id))
      .returning();

    logAdminEvent("blog_post_updated", {
      postId: updated.id,
      slug: updated.slug,
      status: updated.status,
      adminUserId: auth.userId,
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Admin blog update error:", error);
    return NextResponse.json({ error: "Failed to update blog post" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning({
        id: blogPosts.id,
        slug: blogPosts.slug,
      });

    if (!deleted) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    logAdminEvent("blog_post_deleted", {
      postId: deleted.id,
      slug: deleted.slug,
      adminUserId: auth.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin blog delete error:", error);
    return NextResponse.json({ error: "Failed to delete blog post" }, { status: 500 });
  }
}
