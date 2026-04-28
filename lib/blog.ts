import { db } from "@/lib/db";
import { blogPosts, type BlogPost } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type BlogPostStatus = BlogPost["status"];

export interface PostMeta {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  category: string;
  coverImageUrl: string | null;
}

export interface PublishedPost extends PostMeta {
  contentMarkdown: string;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
}

export function calculateReadingTime(markdown: string): string {
  const words = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_[\]()`-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min read`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function postDate(post: BlogPost): string {
  return (post.publishedAt ?? post.createdAt).toISOString();
}

function toPostMeta(post: BlogPost): PostMeta {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.excerpt,
    date: postDate(post),
    readingTime: post.readingTime,
    category: post.category,
    coverImageUrl: post.coverImageUrl,
  };
}

function toPublishedPost(post: BlogPost): PublishedPost {
  return {
    ...toPostMeta(post),
    contentMarkdown: post.contentMarkdown,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const posts = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));

  return posts.map(toPostMeta);
}

export async function getPostMeta(slug: string): Promise<PostMeta | null> {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  return post ? toPostMeta(post) : null;
}

export async function getPublishedPost(slug: string): Promise<PublishedPost | null> {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  return post ? toPublishedPost(post) : null;
}

export function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return value === "draft" || value === "published" || value === "archived";
}
