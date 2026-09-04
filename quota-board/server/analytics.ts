import type {
  AccountView,
  DashboardData,
  ModelUsage,
  RangeKey,
  TrendPoint,
  UsageSnapshot,
} from "../src/types"
import type { DatabaseShape, StoredAccount, TelemetryEvent, TelemetryTotals } from "./types"
import { ENDPOINTS } from "./commandcode"

const RANGE_MS: Record<RangeKey, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
}

export function telemetryFor(
  events: readonly TelemetryEvent[],
  accountId: string,
  since = 0,
): TelemetryTotals {
  const relevant = events.filter(
    (event) => event.accountId === accountId && Date.parse(event.occurredAt) >= since,
  )
  const models = new Map<string, ModelUsage>()
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  for (const event of relevant) {
    cacheReadTokens += event.cacheReadTokens
    cacheWriteTokens += event.cacheWriteTokens
    const current = models.get(event.model) ?? {
      model: event.model,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      cost: 0,
    }
    current.requests += 1
    current.inputTokens += event.inputTokens
    current.outputTokens += event.outputTokens
    current.cacheReadTokens += event.cacheReadTokens
    current.cacheWriteTokens += event.cacheWriteTokens
    current.cost += event.cost
    models.set(event.model, current)
  }
  return {
    cacheReadTokens,
    cacheWriteTokens,
    models: [...models.values()].sort(
      (a, b) => b.inputTokens + b.outputTokens - a.inputTokens - a.outputTokens,
    ),
    eventCount: relevant.length,
  }
}

function latestSnapshot(database: DatabaseShape, accountId: string): UsageSnapshot | null {
  return database.snapshots[accountId]?.at(-1) ?? null
}

function warningStatus(
  snapshot: UsageSnapshot | null,
  fallback: StoredAccount["status"],
): AccountView["status"] {
  if (!snapshot || fallback === "error") return fallback
  const nearWindow = snapshot.windows.some((window) => window.used / window.cap >= 0.8)
  const monthlyUsed =
    snapshot.monthlyCap && snapshot.monthlyCap > 0
      ? 1 - snapshot.monthlyRemaining / snapshot.monthlyCap
      : 0
  return nearWindow || monthlyUsed >= 0.8 ? "warning" : "healthy"
}

export function accountView(database: DatabaseShape, account: StoredAccount): AccountView {
  const snapshot = latestSnapshot(database, account.id)
  return {
    id: account.id,
    label: account.label,
    group: account.group,
    email: account.email ?? null,
    emailMasked: account.emailMasked,
    login: account.login,
    planId: account.planId,
    subscriptionStatus: account.subscriptionStatus,
    periodEnd: account.periodEnd,
    keyFingerprint: account.keyFingerprint,
    status: warningStatus(snapshot, account.status),
    lastSyncAt: account.lastSyncAt,
    error: account.error,
    snapshot,
  }
}

function aggregateModels(accounts: readonly AccountView[]): ModelUsage[] {
  const result = new Map<string, ModelUsage>()
  for (const model of accounts.flatMap((account) => account.snapshot?.models ?? [])) {
    const row = result.get(model.model) ?? {
      model: model.model,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      cost: 0,
    }
    row.requests += model.requests
    row.inputTokens += model.inputTokens
    row.outputTokens += model.outputTokens
    row.cacheReadTokens += model.cacheReadTokens
    row.cacheWriteTokens += model.cacheWriteTokens
    row.cost += model.cost
    result.set(model.model, row)
  }
  return [...result.values()].sort(
    (a, b) => b.inputTokens + b.outputTokens - a.inputTokens - a.outputTokens,
  )
}

function makeTrend(database: DatabaseShape, range: RangeKey): TrendPoint[] {
  const cutoff = Date.now() - RANGE_MS[range]
  const buckets = new Map<string, TrendPoint>()
  for (const snapshots of Object.values(database.snapshots)) {
    const inRange = snapshots.filter((snapshot) => Date.parse(snapshot.capturedAt) >= cutoff)
    for (let index = 1; index < inRange.length; index += 1) {
      const current = inRange[index]
      const previous = inRange[index - 1]
      const date = new Date(current.capturedAt)
      const key =
        range === "24h" ? `${date.toISOString().slice(0, 13)}:00` : date.toISOString().slice(0, 10)
      const point = buckets.get(key) ?? {
        time: key,
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      }
      point.input += Math.max(0, current.inputTokens - previous.inputTokens)
      point.output += Math.max(0, current.outputTokens - previous.outputTokens)
      point.cacheRead += Math.max(0, current.cacheReadTokens - previous.cacheReadTokens)
      point.cacheWrite += Math.max(0, current.cacheWriteTokens - previous.cacheWriteTokens)
      buckets.set(key, point)
    }
  }
  return [...buckets.values()].sort((a, b) => a.time.localeCompare(b.time))
}

export function dashboardData(database: DatabaseShape, range: RangeKey): DashboardData {
  const accounts = database.accounts.map((account) => accountView(database, account))
  const snapshots = accounts.flatMap((account) => (account.snapshot ? [account.snapshot] : []))
  const inputTokens = snapshots.reduce((sum, item) => sum + item.inputTokens, 0)
  const outputTokens = snapshots.reduce((sum, item) => sum + item.outputTokens, 0)
  const cacheReadTokens = snapshots.reduce((sum, item) => sum + item.cacheReadTokens, 0)
  const cacheWriteTokens = snapshots.reduce((sum, item) => sum + item.cacheWriteTokens, 0)
  const cacheDenominator = inputTokens + cacheReadTokens
  const totalRequests = snapshots.reduce((sum, item) => sum + item.totalRequests, 0)
  const completed = snapshots.reduce((sum, item) => sum + item.completedRequests, 0)
  const models = aggregateModels(accounts)

  return {
    generatedAt: new Date().toISOString(),
    range,
    accounts,
    trend: makeTrend(database, range),
    models,
    totals: {
      connected: accounts.filter((account) => account.status !== "error").length,
      errors: accounts.filter((account) => account.status === "error").length,
      monthlyRemaining: snapshots.reduce((sum, item) => sum + item.monthlyRemaining, 0),
      monthlyCap: snapshots.reduce((sum, item) => sum + (item.monthlyCap ?? 0), 0),
      totalTokens: snapshots.reduce((sum, item) => sum + item.totalTokens, 0),
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      cacheHitRate: cacheDenominator > 0 ? cacheReadTokens / cacheDenominator : null,
      totalCost: snapshots.reduce((sum, item) => sum + item.totalCost, 0),
      totalRequests,
      successRate: totalRequests > 0 ? completed / totalRequests : null,
      telemetryCoverage:
        snapshots.length > 0
          ? snapshots.reduce((sum, item) => sum + item.telemetryCoverage, 0) / snapshots.length
          : 0,
    },
    endpoints: ENDPOINTS,
  }
}
