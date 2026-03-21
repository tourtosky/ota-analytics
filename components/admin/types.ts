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

export interface AdminEvent {
  id: number;
  event: string;
  metadata: Record<string, unknown>;
  createdAt: string;
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
