import type { EndpointView, UsageSnapshot, UsageWindow } from "../src/types"
import type { LiveAccountResult, TelemetryTotals } from "./types"

const API_BASE = "https://api.commandcode.ai"
const REQUEST_TIMEOUT_MS = 15_000

export class CommandCodeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export const ENDPOINTS: EndpointView[] = [
  {
    method: "GET",
    path: "/provider/v1/models",
    purpose: "Current model catalog and capabilities",
    stability: "documented",
    data: ["models", "context", "reasoning", "vision"],
  },
  {
    method: "POST",
    path: "/provider/v1/chat/completions",
    purpose: "OpenAI-compatible generation and streamed usage",
    stability: "documented",
    data: ["input", "output", "cache read", "cache write", "model"],
  },
  {
    method: "POST",
    path: "/provider/v1/messages",
    purpose: "Anthropic-compatible generation and streamed usage",
    stability: "documented",
    data: ["input", "output", "cache read", "cache write", "model"],
  },
  {
    method: "GET",
    path: "/alpha/whoami",
    purpose: "Validate a key and resolve its account",
    stability: "client-observed",
    data: ["email", "login", "organization", "key name"],
  },
  {
    method: "GET",
    path: "/alpha/billing/credits",
    purpose: "Credit balances and rolling quota windows",
    stability: "client-observed",
    data: ["monthly", "purchased", "free", "5-hour", "weekly"],
  },
  {
    method: "GET",
    path: "/alpha/billing/subscriptions",
    purpose: "Plan and billing-cycle dates",
    stability: "client-observed",
    data: ["plan", "status", "period start", "period end"],
  },
  {
    method: "GET",
    path: "/alpha/usage/summary",
    purpose: "Billing-period aggregate usage",
    stability: "client-observed",
    data: ["requests", "success rate", "input", "output", "cost", "credits"],
  },
  {
    method: "POST",
    path: "/api/telemetry",
    purpose: "Optional board ingestion for model and cache analytics",
    stability: "board",
    data: ["model", "input", "output", "cache read", "cache write", "cost"],
  },
  {
    method: "POST",
    path: "/api/accounts/:id/key",
    purpose: "Operator-authorized, no-cache key export",
    stability: "board",
    data: ["API key"],
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@")
  if (!name || !domain) return "Account verified"
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${"•".repeat(Math.max(3, name.length - visible.length))}@${domain}`
}

function normalizeResetAt(value: unknown): string | null {
  const numeric = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value
  if (typeof numeric === "number" && Number.isFinite(numeric)) {
    return new Date(numeric >= 1e12 ? numeric : numeric * 1000).toISOString()
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString()
  }
  return null
}

function windowsFrom(value: unknown): UsageWindow[] {
  if (!isRecord(value)) return []
  const result: UsageWindow[] = []
  for (const [name, label] of [
    ["fiveHour", "5-hour"],
    ["weekly", "Weekly"],
  ] as const) {
    const row = value[name]
    if (!isRecord(row)) continue
    const used = numberValue(row.used)
    const cap = numberValue(row.cap)
    if (cap <= 0) continue
    result.push({ name, label, used, cap, resetAt: normalizeResetAt(row.resetAt) })
  }
  return result
}

async function requestJson(apiKey: string, path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CommandCodeRequestError("CommandCode rejected this API key", 401)
    }
    throw new CommandCodeRequestError(`CommandCode request failed (${response.status})`, 502)
  }
  return response.json()
}

function withOrg(
  path: string,
  orgId: string | null,
  extra?: Record<string, string | null>,
): string {
  const url = new URL(`${API_BASE}${path}`)
  if (orgId) url.searchParams.set("orgId", orgId)
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) url.searchParams.set(key, value)
  }
  return `${url.pathname}${url.search}`
}

export async function fetchAccountSnapshot(
  apiKey: string,
  telemetry: TelemetryTotals,
): Promise<LiveAccountResult> {
  const whoami = await requestJson(apiKey, "/alpha/whoami")
  if (!isRecord(whoami) || !isRecord(whoami.user)) {
    throw new Error("CommandCode returned an unrecognized account response")
  }
  const org = isRecord(whoami.org) ? whoami.org : null
  const email = stringValue(whoami.user.email) ?? ""
  const login =
    stringValue(org?.login) ??
    stringValue(whoami.user.userName) ??
    stringValue(whoami.user.name) ??
    "CommandCode account"
  const orgId = stringValue(org?.id)

  const [creditsRaw, subscriptionRaw] = await Promise.all([
    requestJson(apiKey, withOrg("/alpha/billing/credits", orgId)),
    requestJson(apiKey, withOrg("/alpha/billing/subscriptions", orgId)),
  ])
  const credits = isRecord(creditsRaw) && isRecord(creditsRaw.credits) ? creditsRaw.credits : {}
  const subscription =
    isRecord(subscriptionRaw) && isRecord(subscriptionRaw.data) ? subscriptionRaw.data : {}
  const periodStart = stringValue(subscription.currentPeriodStart)
  const summaryRaw = await requestJson(
    apiKey,
    withOrg("/alpha/usage/summary", orgId, { since: periodStart }),
  )
  const summary = isRecord(summaryRaw) ? summaryRaw : {}
  const planId = stringValue(subscription.planId) ?? stringValue(credits.planId)
  const totalRequests = numberValue(summary.totalCount)
  const completedRequests = numberValue(summary.completedCount)
  const failedRequests = numberValue(summary.failedCount)
  const cacheTokens = telemetry.cacheReadTokens + telemetry.cacheWriteTokens
  const summaryTokens = numberValue(summary.totalTokens)
  const coverage = summaryTokens > 0 ? Math.min(1, cacheTokens / summaryTokens) : 0
  const monthlyRemaining = numberValue(credits.monthlyCredits)
  const monthlyConsumed = numberValue(summary.totalMonthlyCredits)
  const monthlyCap = monthlyRemaining + monthlyConsumed

  return {
    email,
    emailMasked: email ? maskEmail(email) : "Email unavailable",
    login,
    planId,
    subscriptionStatus: stringValue(subscription.status),
    periodEnd: stringValue(subscription.currentPeriodEnd),
    snapshot: {
      capturedAt: new Date().toISOString(),
      monthlyRemaining,
      purchasedCredits: numberValue(credits.purchasedCredits),
      freeCredits: numberValue(credits.freeCredits),
      monthlyCap: monthlyCap > 0 ? monthlyCap : null,
      windows: windowsFrom(isRecord(creditsRaw) ? creditsRaw.windowLimits : null),
      totalCost: numberValue(summary.totalCost),
      totalRequests,
      completedRequests,
      failedRequests,
      successRate:
        typeof summary.successRate === "number"
          ? summary.successRate
          : totalRequests > 0
            ? completedRequests / totalRequests
            : null,
      inputTokens: numberValue(summary.totalTokensIn),
      outputTokens: numberValue(summary.totalTokensOut),
      totalTokens: summaryTokens,
      cacheReadTokens: telemetry.cacheReadTokens,
      cacheWriteTokens: telemetry.cacheWriteTokens,
      models: telemetry.models,
      telemetryCoverage: coverage,
    },
  }
}
