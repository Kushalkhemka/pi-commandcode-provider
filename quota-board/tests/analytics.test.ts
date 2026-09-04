import { describe, expect, it } from "vitest"
import { dashboardData, telemetryFor } from "../server/analytics"
import type { DatabaseShape, StoredAccount, TelemetryEvent } from "../server/types"
import type { UsageSnapshot } from "../src/types"

const account: StoredAccount = {
  id: "1dd946d2-63db-4f6b-84af-0a998980d7af",
  label: "Research",
  group: "Lab",
  encryptedKey: "iv.tag.ciphertext",
  keyFingerprint: "key_••••_12345678",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  email: "research@example.com",
  emailMasked: "re••••••@example.com",
  login: "research",
  planId: "individual-pro-v1",
  subscriptionStatus: "active",
  periodEnd: "2026-10-01T00:00:00.000Z",
  status: "healthy",
  lastSyncAt: "2026-09-04T00:00:00.000Z",
  error: null,
}

const snapshot: UsageSnapshot = {
  capturedAt: new Date().toISOString(),
  monthlyRemaining: 52,
  purchasedCredits: 0,
  freeCredits: 0,
  monthlyCap: 80,
  windows: [
    { name: "fiveHour", label: "5-hour", used: 7, cap: 14, resetAt: null },
    { name: "weekly", label: "Weekly", used: 12, cap: 35, resetAt: null },
  ],
  totalCost: 28,
  totalRequests: 100,
  completedRequests: 98,
  failedRequests: 2,
  successRate: 0.98,
  inputTokens: 1_000,
  outputTokens: 300,
  totalTokens: 1_300,
  cacheReadTokens: 500,
  cacheWriteTokens: 100,
  models: [
    {
      model: "model-a",
      requests: 5,
      inputTokens: 1_000,
      outputTokens: 300,
      cacheReadTokens: 500,
      cacheWriteTokens: 100,
      cost: 2,
    },
  ],
  telemetryCoverage: 0.75,
}

describe("quota analytics", () => {
  it("aggregates model and cache telemetry by account", () => {
    const events: TelemetryEvent[] = [
      {
        id: "a",
        accountId: account.id,
        occurredAt: new Date().toISOString(),
        model: "model-a",
        inputTokens: 100,
        outputTokens: 20,
        cacheReadTokens: 40,
        cacheWriteTokens: 5,
        cost: 0.4,
        status: "completed",
      },
      {
        id: "b",
        accountId: account.id,
        occurredAt: new Date().toISOString(),
        model: "model-a",
        inputTokens: 80,
        outputTokens: 12,
        cacheReadTokens: 30,
        cacheWriteTokens: 4,
        cost: 0.3,
        status: "completed",
      },
    ]
    const result = telemetryFor(events, account.id)

    expect(result.cacheReadTokens).toBe(70)
    expect(result.cacheWriteTokens).toBe(9)
    expect(result.models[0]).toMatchObject({ model: "model-a", requests: 2, inputTokens: 180 })
  })

  it("calculates global cache hit rate from eligible input plus cache reads", () => {
    const database: DatabaseShape = {
      version: 1,
      accounts: [account],
      snapshots: { [account.id]: [snapshot] },
      telemetry: [],
    }
    const result = dashboardData(database, "24h")

    expect(result.accounts[0]?.email).toBe("research@example.com")
    expect(result.totals.cacheHitRate).toBeCloseTo(500 / 1_500)
    expect(result.totals.successRate).toBeCloseTo(0.98)
    expect(result.totals.monthlyRemaining).toBe(52)
  })
})
