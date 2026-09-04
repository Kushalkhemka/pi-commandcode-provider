export type RangeKey = "24h" | "7d" | "30d"

export interface UsageWindow {
  name: "fiveHour" | "weekly"
  label: string
  used: number
  cap: number
  resetAt: string | null
}

export interface ModelUsage {
  model: string
  requests: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  cost: number
}

export interface UsageSnapshot {
  capturedAt: string
  monthlyRemaining: number
  purchasedCredits: number
  freeCredits: number
  monthlyCap: number | null
  windows: UsageWindow[]
  totalCost: number
  totalRequests: number
  completedRequests: number
  failedRequests: number
  successRate: number | null
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  models: ModelUsage[]
  telemetryCoverage: number
}

export interface AccountView {
  id: string
  label: string
  group: string | null
  email: string | null
  emailMasked: string
  login: string
  planId: string | null
  subscriptionStatus: string | null
  periodEnd: string | null
  keyFingerprint: string
  status: "healthy" | "warning" | "error" | "pending"
  lastSyncAt: string | null
  error: string | null
  snapshot: UsageSnapshot | null
}

export interface TrendPoint {
  time: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export interface EndpointView {
  method: "GET" | "POST"
  path: string
  purpose: string
  stability: "documented" | "client-observed" | "board"
  data: string[]
}

export interface DashboardData {
  generatedAt: string
  range: RangeKey
  accounts: AccountView[]
  trend: TrendPoint[]
  models: ModelUsage[]
  totals: {
    connected: number
    errors: number
    monthlyRemaining: number
    monthlyCap: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    cacheHitRate: number | null
    totalCost: number
    totalRequests: number
    successRate: number | null
    telemetryCoverage: number
  }
  endpoints: EndpointView[]
}
