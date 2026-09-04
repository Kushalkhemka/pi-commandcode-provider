import { isRecord } from "./converters.ts"
import type { ModelLike, StreamOptions } from "./types.ts"

const PROMPT_CACHE_KEY_MAX_LENGTH = 64

function promptCacheKey(sessionId: string | undefined): string | undefined {
  if (!sessionId) return undefined
  return Array.from(sessionId).slice(0, PROMPT_CACHE_KEY_MAX_LENGTH).join("")
}

/**
 * Command Code follows the OpenAI Chat Completions schema, including
 * `prompt_cache_key`. Pi intentionally emits that field only for OpenAI's own
 * host (or providers that advertise long retention), so add it for Command
 * Code's OpenAI-compatible route while preserving caller payload hooks.
 */
export function withCommandCodePromptCache(
  options: StreamOptions | undefined,
): StreamOptions | undefined {
  const cacheKey =
    options?.cacheRetention === "none" ? undefined : promptCacheKey(options?.sessionId)
  if (!cacheKey) return options

  const onPayload = options?.onPayload
  return {
    ...options,
    onPayload: async (payload: unknown, model: ModelLike) => {
      const replacement = await onPayload?.(payload, model)
      const nextPayload = replacement ?? payload
      if (model.api !== "openai-completions" || !isRecord(nextPayload)) return nextPayload
      if (typeof nextPayload.prompt_cache_key === "string") return nextPayload
      return { ...nextPayload, prompt_cache_key: cacheKey }
    },
  }
}
