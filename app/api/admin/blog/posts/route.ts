import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { calculateReadingTime, isBlogPostStatus, slugify } from "@/lib/blog";
import { logAdminEvent } from "@/lib/admin/events";

const PAGE_SIZE = 20;

async function getUniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, candidate))
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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    const conditions = [];
    if (isBlogPostStatus(status)) {
      conditions.push(eq(blogPosts.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(blogPosts.title, `%${search}%`),
          ilike(blogPosts.slug, `%${search}%`),
          ilike(blogPosts.excerpt, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          category: blogPosts.category,
          coverImageUrl: blogPosts.coverImageUrl,
          status: blogPosts.status,
          readingTime: blogPosts.readingTime,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .where(whereClause)
        .orderBy(desc(blogPosts.updatedAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db
        .select({ count: count() })
        .from(blogPosts)
        .where(whereClause),
    ]);

    return NextResponse.json({
      posts: items,
      total: totalResult[0]?.count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    console.error("Admin blog list error:", error);
    return NextResponse.json({ error: "Failed to load blog posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const title = cleanString(body.title);
    const excerpt = cleanString(body.excerpt);
    const contentMarkdown = cleanString(body.contentMarkdown);
    const category = cleanString(body.category) || "Guides";
    const status = isBlogPostStatus(body.status) ? body.status : "draft";
    const baseSlug = slugify(cleanString(body.slug) || title);

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!baseSlug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }
    if (!excerpt) {
      return NextResponse.json({ error: "Excerpt is required" }, { status: 400 });
    }
    if (!contentMarkdown) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const slug = await getUniqueSlug(baseSlug);
    const now = new Date();

    const [created] = await db
      .insert(blogPosts)
      .values({
        authorId: auth.userId,
        slug,
        title,
        excerpt,
        contentMarkdown,
        category: category.slice(0, 80),
        coverImageUrl: cleanOptionalString(body.coverImageUrl),
        status,
        metaTitle: cleanOptionalString(body.metaTitle),
        metaDescription: cleanOptionalString(body.metaDescription),
        readingTime: calculateReadingTime(contentMarkdown),
        publishedAt: status === "published" ? now : null,
        updatedAt: now,
      })
      .returning();

    logAdminEvent("blog_post_created", {
      postId: created.id,
      slug: created.slug,
      status: created.status,
      adminUserId: auth.userId,
    });

    return NextResponse.json({ post: created }, { status: 201 });
  } catch (error) {
    console.error("Admin blog create error:", error);
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 });
  }
}
