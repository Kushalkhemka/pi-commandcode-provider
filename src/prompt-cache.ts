import { isRecord } from "./converters.ts"

const PROMPT_CACHE_KEY_MAX_LENGTH = 64

interface PromptCacheOptions<TModel> {
  sessionId?: string
  cacheRetention?: "none" | "short" | "long"
  onPayload?: (payload: unknown, model: TModel) => unknown | Promise<unknown>
}

type PromptCacheResult<TOptions, TModel> = Omit<TOptions, "onPayload"> & {
  onPayload?: PromptCacheOptions<TModel>["onPayload"]
}

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
export function withCommandCodePromptCache<TModel, TOptions extends PromptCacheOptions<TModel>>(
  options: TOptions | undefined,
): PromptCacheResult<TOptions, TModel> | undefined {
  const cacheKey =
    options?.cacheRetention === "none" ? undefined : promptCacheKey(options?.sessionId)
  if (!cacheKey) return options

  const onPayload = options?.onPayload
  const result = {
    ...options,
    onPayload: async (payload: unknown, model: TModel) => {
      const replacement = await onPayload?.(payload, model)
      const nextPayload = replacement ?? payload
      if (!isRecord(model) || model.api !== "openai-completions" || !isRecord(nextPayload)) {
        return nextPayload
      }
      if (typeof nextPayload.prompt_cache_key === "string") return nextPayload
      return { ...nextPayload, prompt_cache_key: cacheKey }
    },
  }
  // The callback is rebuilt with the caller's inferred model type; only the
  // onPayload property changes, while every provider-specific option is kept.
  return result as PromptCacheResult<TOptions, TModel>
}
