# Admin Multi-Page Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the monolithic admin page (740 lines, everything in one file with tabs) into separate pages with a shared sidebar layout, plus add a new Clients management page.

**Architecture:** Create `app/admin/layout.tsx` as a shared shell with sidebar navigation. Extract each tab into its own page (`/admin`, `/admin/analyses`, `/admin/scraping`, `/admin/api-usage`, `/admin/clients`). Shared types/helpers/sub-components go into `components/admin/`. The existing `/api/admin/stats` endpoint stays as-is (each page fetches only the subset it needs from the same response, or we add lightweight per-page endpoints). A new `/api/admin/clients` endpoint serves user data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, Supabase Auth, existing admin theme CSS (`app/admin/theme.css`)

---

## File Structure

```
components/admin/
  types.ts               — Shared TypeScript interfaces (Stats, AnalysisItem, etc.)
  helpers.ts             — timeAgo, formatDuration, scoreColor, scoreBg, statusBadge, priorityBadge
  StatCard.tsx           — StatCard component
  MiniCard.tsx           — MiniCard component
  ScoreDistributionChart.tsx — Score histogram
  EventsTable.tsx        — Reusable events table
  DetailPanel.tsx        — Expandable analysis detail

app/admin/
  layout.tsx             — Shared admin layout with sidebar + header (NEW)
  page.tsx               — Dashboard overview (stats + chart + recent activity) (REWRITE)
  analyses/page.tsx      — Analyses table with filters, pagination, detail panels (NEW)
  scraping/page.tsx      — Scraping events monitoring (NEW)
  api-usage/page.tsx     — API usage monitoring (NEW)
  clients/page.tsx       — Client/user management (NEW)

app/api/admin/
  clients/route.ts       — GET list clients, POST update role (NEW)
```

---

### Task 1: Extract Shared Types & Helpers

**Files:**
- Create: `components/admin/types.ts`
- Create: `components/admin/helpers.ts`

- [ ] **Step 1: Create shared types file**

Extract all interfaces from the monolithic page into `components/admin/types.ts`:

```typescript
// components/admin/types.ts

export interface Stats {
  totalAnalyses: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
  avgScore: number;
  todayCount: number;
  scrapeSuccessRate: number;
  cacheEntries: number;
  avgProcessingTime?: number;
  scoreDistribution?: number[];
}

export interface AnalysisItem {
  id: string;
  viatorProductCode: string;
  productTitle: string | null;
  status: string;
  overallScore: number | null;
  dataSource: string | null;
  competitorCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface AnalysisDetail {
  id: string;
  viatorProductCode: string;
  productTitle: string | null;
  status: string;
  overallScore: number | null;
  scores: {
    title: number;
    description: number;
    pricing: number;
    reviews: number;
    photos: number;
    completeness: number;
  } | null;
  productData: Record<string, unknown> | null;
  competitorsData: Record<string, unknown>[] | null;
  recommendations: { priority: string; category: string; title: string; description: string; impact: string }[] | null;
  reviewInsights: { positives?: string[]; negatives?: string[]; sentiment?: string; keyPhrases?: string[]; opportunities?: string[] } | null;
  dataSource: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ScrapingEvents {
  totalAttempts: number;
  successCount: number;
  blockedCount: number;
  cacheHitCount: number;
  recentEvents: AdminEvent[];
}

export interface ApiEvents {
  viatorCallsToday: number;
  viatorCallsTotal: number;
  anthropicCallsToday: number;
  anthropicCallsTotal: number;
  recentEvents: AdminEvent[];
}

export interface AdminEvent {
  id: number;
  event: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardData {
  stats: Stats;
  analyses: {
    items: AnalysisItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  events: {
    scraping: ScrapingEvents;
    api: ApiEvents;
  };
}

export interface ClientUser {
  id: string;
  email: string;
  role: "admin" | "client";
  fullName: string | null;
  companyName: string | null;
  createdAt: string;
  analysisCount: number;
}
```

- [ ] **Step 2: Create shared helpers file**

```typescript
// components/admin/helpers.ts

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function scoreColor(score: number | null): string {
  if (score === null) return "adm-text-muted";
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

export function scoreBg(score: number | null): string {
  if (score === null) return "bg-slate-500/10 adm-text-muted";
  if (score >= 70) return "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20";
  if (score >= 40) return "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20";
  return "bg-red-500/10 text-red-600 ring-1 ring-red-500/20";
}

export function statusBadge(status: string): string {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
    failed: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20",
    processing: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20",
    pending: "bg-slate-500/10 adm-text-muted ring-1 ring-slate-500/20",
  };
  return map[status] || "bg-slate-500/10 adm-text-muted";
}

export function priorityBadge(priority: string): string {
  const map: Record<string, string> = {
    high: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20",
    low: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20",
  };
  return map[priority] || "bg-slate-500/10 adm-text-muted";
}

export type Accent = "sky" | "emerald" | "amber" | "red" | "violet" | "slate";
export const accentText: Record<Accent, string> = {
  sky: "text-sky-500", emerald: "text-emerald-500", amber: "text-amber-500",
  red: "text-red-500", violet: "text-violet-500", slate: "adm-text-secondary",
};
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/types.ts components/admin/helpers.ts
git commit -m "refactor: extract shared admin types and helpers"
```

---

### Task 2: Extract Shared Sub-Components

**Files:**
- Create: `components/admin/StatCard.tsx`
- Create: `components/admin/MiniCard.tsx`
- Create: `components/admin/ScoreDistributionChart.tsx`
- Create: `components/admin/EventsTable.tsx`
- Create: `components/admin/DetailPanel.tsx`

- [ ] **Step 1: Create StatCard**

```tsx
// components/admin/StatCard.tsx
import { Accent, accentText } from "./helpers";

export function StatCard({ label, value, accent, sub }: { label: string; value: string | number; accent: Accent; sub: string }) {
  return (
    <div className="adm-card rounded-xl p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider adm-text-muted font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 font-mono ${accentText[accent]}`}>{value}</div>
      <div className="text-[11px] adm-text-faint mt-0.5">{sub}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create MiniCard**

```tsx
// components/admin/MiniCard.tsx
import { Accent, accentText } from "./helpers";

export function MiniCard({ label, value, accent = "slate" }: { label: string; value: number; accent?: Accent }) {
  return (
    <div className="adm-elevated rounded-lg p-3 text-center" style={{ border: "1px solid var(--adm-border)" }}>
      <div className="text-[10px] uppercase tracking-wider adm-text-muted font-medium">{label}</div>
      <div className={`text-xl font-bold mt-1 font-mono ${accentText[accent]}`}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create ScoreDistributionChart**

```tsx
// components/admin/ScoreDistributionChart.tsx
export function ScoreDistributionChart({ distribution }: { distribution: number[] }) {
  const max = Math.max(...distribution, 1);
  const labels = ["0-20", "21-40", "41-60", "61-80", "81-100"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500"];
  return (
    <div className="flex items-end gap-2 h-20">
      {distribution.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono adm-text-secondary">{count}</span>
          <div className="w-full adm-chart-track rounded-t-sm overflow-hidden relative" style={{ height: "48px" }}>
            <div className={`absolute bottom-0 w-full ${colors[i]} rounded-t-sm transition-all duration-500`} style={{ height: `${max > 0 ? (count / max) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] adm-text-muted">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create EventsTable**

```tsx
// components/admin/EventsTable.tsx
import { AdminEvent } from "./types";

export function EventsTable({ events, columns, renderRow }: {
  events: AdminEvent[];
  columns: string[];
  renderRow: (ev: AdminEvent) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
            {columns.map((col, i) => (
              <th key={col} className={`px-3 py-2.5 text-[11px] uppercase tracking-wider adm-text-muted font-medium ${i === columns.length - 1 ? "text-right" : "text-left"}`}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="adm-row-hover" style={{ borderBottom: "1px solid var(--adm-border)" }}>{renderRow(ev)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Create DetailPanel**

Extract the existing `DetailPanel` from the monolithic page into `components/admin/DetailPanel.tsx`. It uses `AnalysisDetail` from types, and `scoreColor`, `priorityBadge`, `timeAgo` from helpers. Copy it verbatim from the current `app/admin/page.tsx` lines 623-738, updating imports.

- [ ] **Step 6: Commit**

```bash
git add components/admin/
git commit -m "refactor: extract admin sub-components into components/admin/"
```

---

### Task 3: Create Admin Layout with Sidebar

**Files:**
- Create: `app/admin/layout.tsx`

The layout provides: sidebar navigation (collapsible on mobile), header with branding/theme toggle/logout, and wraps child pages. The theme toggle + CSS import lives here so all admin pages inherit it.

- [ ] **Step 1: Create the admin layout**

Key design decisions:
- Sidebar with nav links: Dashboard, Analyses, Scraping, API Usage, Clients
- Use `usePathname()` to highlight active link
- Theme toggle (dark/light) persisted to localStorage
- Logout button using Supabase client
- Import `./theme.css` here (remove from individual pages)
- Responsive: sidebar collapses to top nav on mobile
- Icons: use inline SVGs (same pattern as existing code, no new deps)

Nav items:
```
/admin          → Dashboard (grid/chart icon)
/admin/analyses → Analyses (list icon)
/admin/scraping → Scraping (globe icon)
/admin/api-usage → API Usage (zap icon)
/admin/clients  → Clients (users icon)
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: add admin layout with sidebar navigation"
```

---

### Task 4: Rewrite Dashboard Overview Page

**Files:**
- Rewrite: `app/admin/page.tsx`

The dashboard page now only shows the overview: 6 stat cards, score distribution chart, and a compact recent-activity summary (last 5 analyses as a mini list). No tabs, no filters — those live on their own pages.

- [ ] **Step 1: Rewrite dashboard page**

- Fetches `/api/admin/stats` (same endpoint)
- Shows: stat cards grid, score distribution chart, recent 5 analyses as a compact list with links to `/admin/analyses`
- Auto-refresh logic stays here
- Remove all tab/filter/scraping/api UI — those are now separate pages

- [ ] **Step 2: Verify it renders at `/admin`**

Run: `npm run dev`, visit `http://localhost:3000/admin`
Expected: Stats cards + score chart + recent analyses list. Sidebar navigation visible.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: rewrite admin dashboard as overview page"
```

---

### Task 5: Create Analyses Page

**Files:**
- Create: `app/admin/analyses/page.tsx`

Move the full analyses table with filters, pagination, search, expandable detail panels from the old monolithic page into this dedicated page.

- [ ] **Step 1: Create analyses page**

- Uses the same `/api/admin/stats` endpoint with query params for filtering/pagination
- Filter bar: status, data source, search, time range
- Full table with columns: Product, Score, Status, Source, Competitors, Created, Actions
- Expandable rows with DetailPanel
- Pagination controls
- Rerun/delete/view-report actions

- [ ] **Step 2: Verify at `/admin/analyses`**

Run dev server, navigate to `/admin/analyses`.
Expected: Full filterable table with all existing functionality.

- [ ] **Step 3: Commit**

```bash
git add app/admin/analyses/page.tsx
git commit -m "feat: add dedicated analyses management page"
```

---

### Task 6: Create Scraping Page

**Files:**
- Create: `app/admin/scraping/page.tsx`

- [ ] **Step 1: Create scraping page**

- Fetches `/api/admin/stats` and uses `data.events.scraping`
- 4 MiniCards: Total Attempts, Successes, Blocked, Cache Hits
- Success rate progress bar
- EventsTable showing recent scraping events with columns: Time, Event, URL, Duration

- [ ] **Step 2: Commit**

```bash
git add app/admin/scraping/page.tsx
git commit -m "feat: add dedicated scraping monitoring page"
```

---

### Task 7: Create API Usage Page

**Files:**
- Create: `app/admin/api-usage/page.tsx`

- [ ] **Step 1: Create API usage page**

- Fetches `/api/admin/stats` and uses `data.events.api`
- 4 MiniCards: Viator Today, Viator Total, Claude Today, Claude Total
- EventsTable showing recent API events with columns: Time, Service, Endpoint, Duration

- [ ] **Step 2: Commit**

```bash
git add app/admin/api-usage/page.tsx
git commit -m "feat: add dedicated API usage monitoring page"
```

---

### Task 8: Create Clients API Endpoint

**Files:**
- Create: `app/api/admin/clients/route.ts`

- [ ] **Step 1: Create clients API route**

```typescript
// GET: List all profiles with analysis count
// Returns: ClientUser[] with id, email (from Supabase), role, fullName, companyName, createdAt, analysisCount

// We can't query Supabase auth.users directly from Drizzle, so:
// - Query profiles table joined with analyses count
// - For email, we need the Supabase admin client

// PATCH: Update a client's role
// Body: { userId: string, role: "admin" | "client" }
```

Key: Use Supabase admin client (`createClient` from `@supabase/supabase-js` with service role key) to list users and match with profiles. Or simpler: just query profiles + count analyses per user. Email can come from `supabase.auth.admin.listUsers()`.

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/clients/route.ts
git commit -m "feat: add clients API endpoint for admin"
```

---

### Task 9: Create Clients Page

**Files:**
- Create: `app/admin/clients/page.tsx`

- [ ] **Step 1: Create clients management page**

- Fetches `/api/admin/clients`
- Table: Name, Email, Role, Company, Analyses, Joined, Actions
- Role toggle: dropdown to switch between admin/client (with confirmation)
- Shows total client count
- Search by name/email

- [ ] **Step 2: Commit**

```bash
git add app/admin/clients/page.tsx
git commit -m "feat: add client management page for admin"
```

---

### Task 10: Clean Up & Final Integration

**Files:**
- Modify: `app/admin/page.tsx` (already rewritten in Task 4)
- Delete old code that's been extracted

- [ ] **Step 1: Verify all pages work**

Visit each page and confirm:
- `/admin` — dashboard overview with sidebar
- `/admin/analyses` — full table with filters
- `/admin/scraping` — scraping monitoring
- `/admin/api-usage` — API usage
- `/admin/clients` — client management

- [ ] **Step 2: Verify sidebar active states**

Navigate between pages, confirm the active link highlights correctly in the sidebar.

- [ ] **Step 3: Verify theme toggle persists across pages**

Toggle dark/light mode, navigate between pages, confirm theme stays.

- [ ] **Step 4: Commit final cleanup**

```bash
git add -A
git commit -m "refactor: complete admin multi-page restructure"
```
