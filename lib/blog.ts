import fs from "fs";
import path from "path";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  category: string;
}

const POSTS_DIR = path.join(process.cwd(), "content/blog");

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  const posts = files.map((filename) => {
    const slug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(POSTS_DIR, filename);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract frontmatter between --- delimiters
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) throw new Error(`Missing frontmatter in ${filename}`);

    const fm: Record<string, string> = {};
    frontmatterMatch[1].split("\n").forEach((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
      fm[key] = value;
    });

    return {
      slug,
      title: fm.title,
      description: fm.description,
      date: fm.date,
      readingTime: fm.readingTime,
      category: fm.category,
    };
  });

  // Sort by date descending
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostMeta(slug: string): PostMeta | null {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}
