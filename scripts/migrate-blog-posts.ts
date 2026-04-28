import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { calculateReadingTime } from "@/lib/blog";

config({ path: ".env.local" });

const POSTS_DIR = path.join(process.cwd(), "content/blog");

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error("Missing frontmatter");

  const frontmatter: Record<string, string> = {};
  match[1].split("\n").forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    frontmatter[key] = value;
  });

  return {
    frontmatter,
    body: content.slice(match[0].length).trim(),
  };
}

async function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log("No content/blog directory found.");
    return;
  }

  const files = fs.readdirSync(POSTS_DIR).filter((file) => file.endsWith(".mdx"));
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const content = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const publishedAt = frontmatter.date ? new Date(frontmatter.date) : new Date();

    await db
      .insert(blogPosts)
      .values({
        slug,
        title: frontmatter.title || slug,
        excerpt: frontmatter.description || "",
        contentMarkdown: body,
        category: frontmatter.category || "Guides",
        status: "published",
        readingTime: frontmatter.readingTime || calculateReadingTime(body),
        publishedAt,
        createdAt: publishedAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: blogPosts.slug,
        set: {
          title: frontmatter.title || slug,
          excerpt: frontmatter.description || "",
          contentMarkdown: body,
          category: frontmatter.category || "Guides",
          status: "published",
          readingTime: frontmatter.readingTime || calculateReadingTime(body),
          publishedAt,
          updatedAt: new Date(),
        },
      });

    console.log(`Migrated ${slug}`);
  }
}

main()
  .then(() => {
    console.log("Blog migration complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
