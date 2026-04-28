"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, FilePenLine, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import { timeAgo } from "@/components/admin/helpers";

type BlogStatus = "draft" | "published" | "archived";
type EditorTab = "write" | "preview";

interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  coverImageUrl: string | null;
  status: BlogStatus;
  readingTime: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BlogPostDetail extends BlogPostListItem {
  contentMarkdown: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

interface BlogListResponse {
  posts: BlogPostListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface BlogForm {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  category: string;
  coverImageUrl: string;
  status: BlogStatus;
  metaTitle: string;
  metaDescription: string;
}

const emptyForm: BlogForm = {
  id: null,
  title: "",
  slug: "",
  excerpt: "",
  contentMarkdown: "",
  category: "Guides",
  coverImageUrl: "",
  status: "draft",
  metaTitle: "",
  metaDescription: "",
};

const statusStyles: Record<BlogStatus, string> = {
  draft: "bg-slate-500/10 adm-text-secondary ring-1 ring-slate-500/20",
  published: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
  archived: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20",
};

function localSlugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function toForm(post: BlogPostDetail): BlogForm {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentMarkdown: post.contentMarkdown,
    category: post.category,
    coverImageUrl: post.coverImageUrl || "",
    status: post.status,
    metaTitle: post.metaTitle || "",
    metaDescription: post.metaDescription || "",
  };
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [tab, setTab] = useState<EditorTab>("write");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        status: statusFilter,
      });
      if (searchDebounced) params.set("search", searchDebounced);
      const res = await fetch(`/api/admin/blog/posts?${params}`);
      const data: BlogListResponse | { error: string } = await res.json();
      if (!res.ok) throw new Error("error" in data ? data.error : `API error: ${res.status}`);
      const payload = data as BlogListResponse;
      setPosts(payload.posts);
      setTotal(payload.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const selectPost = async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`);
      const data: { post: BlogPostDetail } | { error: string } = await res.json();
      if (!res.ok) throw new Error("error" in data ? data.error : `API error: ${res.status}`);
      setForm(toForm((data as { post: BlogPostDetail }).post));
      setSlugTouched(true);
      setTab("write");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post");
    } finally {
      setDetailLoading(false);
    }
  };

  const newPost = () => {
    setForm(emptyForm);
    setSlugTouched(false);
    setTab("write");
    setError(null);
  };

  const setField = (field: keyof BlogForm, value: string) => {
    setForm((current) => {
      if (field === "title" && !current.id && !slugTouched) {
        return { ...current, title: value, slug: localSlugify(value) };
      }
      return { ...current, [field]: value };
    });
  };

  const savePost = async (statusOverride?: BlogStatus) => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        contentMarkdown: form.contentMarkdown,
        category: form.category,
        coverImageUrl: form.coverImageUrl,
        status: statusOverride || form.status,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      };
      const url = form.id ? `/api/admin/blog/posts/${form.id}` : "/api/admin/blog/posts";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: { post: BlogPostDetail } | { error: string } = await res.json();
      if (!res.ok) throw new Error("error" in data ? data.error : "Failed to save post");

      setForm(toForm((data as { post: BlogPostDetail }).post));
      setSlugTouched(true);
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async () => {
    if (!form.id) return;
    if (!confirm("Delete this blog post?")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/posts/${form.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete post");
      newPost();
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold adm-text-primary tracking-tight">Blog</h1>
          <p className="text-xs adm-text-muted mt-0.5">{total} posts</p>
        </div>
        <button onClick={newPost} className="adm-btn px-3 py-2 text-xs rounded-md transition-colors inline-flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          New Post
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-red-400 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="adm-card rounded-xl overflow-hidden">
          <div className="p-4 space-y-2" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search posts..."
              className="adm-input rounded-md px-3 py-2 text-xs w-full"
            />
            <select
              value={statusFilter}
              onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
              className="adm-input adm-select rounded-md px-3 py-2 text-xs w-full"
            >
              <option value="all">All statuses</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm adm-text-muted">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center text-sm adm-text-muted">No posts found</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--adm-border)" }}>
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => selectPost(post.id)}
                  className={`w-full p-4 text-left adm-row-hover transition-colors ${form.id === post.id ? "adm-elevated" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold adm-text-primary truncate">{post.title}</h2>
                      <p className="text-[11px] adm-text-muted font-mono truncate mt-1">/{post.slug}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[post.status]}`}>
                      {post.status}
                    </span>
                  </div>
                  <p className="text-xs adm-text-secondary line-clamp-2 mt-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-3 text-[11px] adm-text-muted">
                    <span>{post.category} · {post.readingTime}</span>
                    <span>{timeAgo(post.updatedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
            <span className="text-xs adm-text-muted">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="adm-btn px-3 py-1.5 text-xs rounded-md disabled:opacity-30">Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="adm-btn px-3 py-1.5 text-xs rounded-md disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>

        <div className="adm-card rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <div>
              <h2 className="text-sm font-semibold adm-text-primary">
                {form.id ? "Edit Post" : "New Post"}
              </h2>
              <p className="text-[11px] adm-text-muted mt-0.5">
                {form.status === "published" ? "Visible on /blog" : "Not visible publicly"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {form.id && form.status === "published" && (
                <Link href={`/blog/${form.slug}`} target="_blank" className="adm-btn px-2.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View
                </Link>
              )}
              {form.id && (
                <button onClick={deletePost} disabled={saving} className="adm-btn px-2.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 hover:!text-red-500 disabled:opacity-30">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              <button onClick={() => savePost()} disabled={saving || detailLoading} className="adm-btn px-2.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 disabled:opacity-30">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={() => savePost(form.status === "published" ? "draft" : "published")}
                disabled={saving || detailLoading}
                className={`px-2.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 transition-colors disabled:opacity-30 ${
                  form.status === "published"
                    ? "adm-btn"
                    : "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 hover:bg-emerald-500/15"
                }`}
              >
                {form.status === "published" ? "Unpublish" : "Publish"}
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="p-16 text-center text-sm adm-text-muted">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
              Loading post...
            </div>
          ) : (
            <div className="p-4 space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Title</span>
                  <input value={form.title} onChange={(event) => setField("title", event.target.value)} className="adm-input rounded-md px-3 py-2 text-sm w-full" />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Slug</span>
                  <input
                    value={form.slug}
                    onChange={(event) => { setSlugTouched(true); setField("slug", localSlugify(event.target.value)); }}
                    className="adm-input rounded-md px-3 py-2 text-sm w-full font-mono"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Category</span>
                  <input value={form.category} onChange={(event) => setField("category", event.target.value)} className="adm-input rounded-md px-3 py-2 text-sm w-full" />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Status</span>
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BlogStatus }))} className="adm-input adm-select rounded-md px-3 py-2 text-sm w-full">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Cover Image URL</span>
                  <input value={form.coverImageUrl} onChange={(event) => setField("coverImageUrl", event.target.value)} className="adm-input rounded-md px-3 py-2 text-sm w-full" />
                </label>
              </div>

              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Excerpt</span>
                <textarea value={form.excerpt} onChange={(event) => setField("excerpt", event.target.value)} rows={3} className="adm-input rounded-md px-3 py-2 text-sm w-full resize-y" />
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Meta Title</span>
                  <input value={form.metaTitle} onChange={(event) => setField("metaTitle", event.target.value)} className="adm-input rounded-md px-3 py-2 text-sm w-full" />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium mb-1.5">Meta Description</span>
                  <input value={form.metaDescription} onChange={(event) => setField("metaDescription", event.target.value)} className="adm-input rounded-md px-3 py-2 text-sm w-full" />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="block text-[11px] uppercase tracking-wider adm-text-muted font-medium">Content</span>
                  <div className="inline-flex rounded-md overflow-hidden ring-1 ring-[var(--adm-ring-btn)]">
                    <button onClick={() => setTab("write")} className={`px-3 py-1.5 text-xs inline-flex items-center gap-1.5 ${tab === "write" ? "bg-sky-500/10 text-sky-500" : "adm-btn border-0"}`}>
                      <FilePenLine className="w-3.5 h-3.5" />
                      Write
                    </button>
                    <button onClick={() => setTab("preview")} className={`px-3 py-1.5 text-xs inline-flex items-center gap-1.5 ${tab === "preview" ? "bg-sky-500/10 text-sky-500" : "adm-btn border-0"}`}>
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                  </div>
                </div>

                {tab === "write" ? (
                  <textarea
                    value={form.contentMarkdown}
                    onChange={(event) => setField("contentMarkdown", event.target.value)}
                    rows={18}
                    className="adm-input rounded-md px-3 py-3 text-sm w-full resize-y font-mono leading-relaxed"
                    placeholder="Write Markdown here..."
                  />
                ) : (
                  <div className="adm-elevated rounded-md p-5 min-h-[460px]">
                    {form.contentMarkdown ? (
                      <MarkdownContent content={form.contentMarkdown} className="adm-prose prose max-w-none" />
                    ) : (
                      <div className="text-sm adm-text-muted">Nothing to preview yet.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
