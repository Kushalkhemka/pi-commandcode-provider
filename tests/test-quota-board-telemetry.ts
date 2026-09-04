import assert from "node:assert/strict"

import { createQuotaBoardReporter } from "../src/quota-board-telemetry.ts"
import type { AssistantMessageEvent, ModelLike } from "../src/types.ts"

const model: ModelLike = {
  id: "gpt-5.6-luna",
  api: "commandcode-custom",
  provider: "commandcode",
  maxTokens: 64_000,
  cost: { input: 0.2, output: 1.2, cacheRead: 0.02, cacheWrite: 0.25 },
}

const event: AssistantMessageEvent = {
  type: "done",
  reason: "stop",
  message: {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: {
      input: 1_000,
      output: 200,
      cacheRead: 400,
      cacheWrite: 25,
      totalTokens: 1_625,
      cost: { input: 0.1, output: 0.2, cacheRead: 0.03, cacheWrite: 0.01, total: 0.34 },
    },
    stopReason: "stop",
    timestamp: Date.now(),
  },
}

let resolveRequest!: (value: { input: RequestInfo | URL; init?: RequestInit }) => void
const request = new Promise<{ input: RequestInfo | URL; init?: RequestInit }>((resolve) => {
  resolveRequest = resolve
})
const fetchImpl: typeof fetch = async (input, init) => {
  resolveRequest({ input, init })
  return new Response(null, { status: 202 })
}

const reporter = createQuotaBoardReporter(
  {
    COMMANDCODE_QUOTA_BOARD_URL: "http://127.0.0.1:8787",
    COMMANDCODE_QUOTA_BOARD_TOKEN: "test-ingest-token",
  },
  fetchImpl,
)
assert.ok(reporter)
reporter.observe(event, model, "cmd_test_provider_key")

const captured = await request
assert.equal(String(captured.input), "http://127.0.0.1:8787/api/telemetry")
assert.equal(
  (captured.init?.headers as Record<string, string>).authorization,
  "Bearer test-ingest-token",
)
const body = JSON.parse(String(captured.init?.body)) as Record<string, unknown>
assert.match(String(body.keyFingerprint), /^key_••••_[a-f0-9]{8}$/)
assert.equal(body.model, model.id)
assert.equal(body.cacheReadTokens, 400)
assert.equal(body.cacheWriteTokens, 25)
assert.equal(body.status, "completed")
assert.equal(JSON.stringify(body).includes("cmd_test_provider_key"), false)

assert.equal(createQuotaBoardReporter({}, fetchImpl), undefined)

console.log("quota board telemetry tests passed")
