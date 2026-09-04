import { createHash } from "node:crypto"

import type { AssistantMessageEvent, AssistantMessageLike, ModelLike } from "./types.ts"

const DEFAULT_TIMEOUT_MS = 2_500

function endpointFor(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (!url.pathname.endsWith("/api/telemetry")) {
      url.pathname = `${url.pathname.replace(/\/$/, "")}/api/telemetry`
    }
    return url.toString()
  } catch {
    return null
  }
}

function terminalMessage(event: AssistantMessageEvent): AssistantMessageLike | null {
  if (event.type === "done") return event.message
  if (event.type === "error") return event.error
  return null
}

function keyFingerprint(apiKey: string): string {
  const digest = createHash("sha256").update(apiKey).digest("hex").slice(0, 8)
  return `key_••••_${digest}`
}

export interface QuotaBoardReporter {
  observe(event: AssistantMessageEvent, model: ModelLike, apiKey?: string): void
}

export function createQuotaBoardReporter(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): QuotaBoardReporter | undefined {
  const endpoint = env.COMMANDCODE_QUOTA_BOARD_URL
    ? endpointFor(env.COMMANDCODE_QUOTA_BOARD_URL)
    : null
  if (!endpoint) return undefined
  const token = env.COMMANDCODE_QUOTA_BOARD_TOKEN?.trim()

  return {
    observe(event, model, apiKey) {
      const message = terminalMessage(event)
      if (!message || !apiKey || apiKey.startsWith("$")) return
      const status = event.type === "done" ? "completed" : "failed"
      const usage = message.usage
      void fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          keyFingerprint: keyFingerprint(apiKey),
          occurredAt: new Date().toISOString(),
          model: model.id,
          inputTokens: usage.input,
          outputTokens: usage.output,
          cacheReadTokens: usage.cacheRead,
          cacheWriteTokens: usage.cacheWrite,
          cost: usage.cost.total,
          status,
        }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      }).catch(() => undefined)
    },
  }
}
