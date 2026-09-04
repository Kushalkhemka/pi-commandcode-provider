import type { AccountView, ModelUsage, UsageSnapshot } from "../src/types"

export interface StoredAccount {
  id: string
  label: string
  group: string | null
  encryptedKey: string
  keyFingerprint: string
  createdAt: string
  updatedAt: string
  email: string | null
  emailMasked: string
  login: string
  planId: string | null
  subscriptionStatus: string | null
  periodEnd: string | null
  status: AccountView["status"]
  lastSyncAt: string | null
  error: string | null
}

export interface TelemetryEvent {
  id: string
  accountId: string
  occurredAt: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  cost: number
  status: "completed" | "failed"
}

export interface DatabaseShape {
  version: 1
  accounts: StoredAccount[]
  snapshots: Record<string, UsageSnapshot[]>
  telemetry: TelemetryEvent[]
}

export interface LiveAccountResult {
  email: string
  emailMasked: string
  login: string
  planId: string | null
  subscriptionStatus: string | null
  periodEnd: string | null
  snapshot: UsageSnapshot
}

export interface TelemetryTotals {
  cacheReadTokens: number
  cacheWriteTokens: number
  models: ModelUsage[]
  eventCount: number
}
