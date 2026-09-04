import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { withCommandCodePromptCache } from "../src/prompt-cache.ts"
import { makeModel } from "./helpers.ts"

describe("Command Code prompt-cache routing", () => {
  it("adds a stable session cache key to OpenAI-compatible payloads", async () => {
    const options = withCommandCodePromptCache({ sessionId: "session-123" })
    const payload = await options?.onPayload?.(
      { model: "gpt-5.6-luna", stream: true },
      makeModel({ api: "openai-completions" }),
    )

    assert.deepEqual(payload, {
      model: "gpt-5.6-luna",
      stream: true,
      prompt_cache_key: "session-123",
    })
  })

  it("does not add a key when caching is disabled", () => {
    const options = { sessionId: "session-123", cacheRetention: "none" as const }
    assert.equal(withCommandCodePromptCache(options), options)
  })

  it("preserves an explicit cache key returned by the caller hook", async () => {
    const options = withCommandCodePromptCache({
      sessionId: "session-123",
      onPayload: () => ({ prompt_cache_key: "caller-key", stream: true }),
    })
    const payload = await options?.onPayload?.(
      { stream: true },
      makeModel({ api: "openai-completions" }),
    )

    assert.deepEqual(payload, { prompt_cache_key: "caller-key", stream: true })
  })

  it("does not modify Anthropic payloads", async () => {
    const options = withCommandCodePromptCache({ sessionId: "session-123" })
    const payload = await options?.onPayload?.(
      { model: "claude-sonnet-5", stream: true },
      makeModel({ api: "anthropic-messages" }),
    )

    assert.deepEqual(payload, { model: "claude-sonnet-5", stream: true })
  })

  it("clamps cache keys to the OpenAI-compatible 64-character limit", async () => {
    const options = withCommandCodePromptCache({ sessionId: "x".repeat(80) })
    const payload = await options?.onPayload?.({}, makeModel({ api: "openai-completions" }))

    assert.equal((payload as { prompt_cache_key?: string }).prompt_cache_key, "x".repeat(64))
  })
})
