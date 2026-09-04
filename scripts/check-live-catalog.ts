import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import { MODEL_COSTS } from "../src/pricing.ts"

const MODELS_URL = "https://api.commandcode.ai/provider/v1/models"

interface CatalogFixture {
  modelIds: string[]
}

function modelIdsFromResponse(value: unknown): string[] {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    throw new Error("Command Code model response has no data array")
  }
  const data = (value as { data?: unknown }).data
  if (!Array.isArray(data)) throw new Error("Command Code model response data is not an array")

  return data.map((entry) => {
    if (typeof entry !== "object" || entry === null || !("id" in entry)) {
      throw new Error("Command Code model entry has no id")
    }
    const id = (entry as { id?: unknown }).id
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("Command Code model id is invalid")
    }
    return id
  })
}

// This maintenance-only check sends no user data or credentials to the fixed,
// documented public model endpoint.
const fetchImpl: typeof fetch = globalThis.fetch
const response = await fetchImpl(MODELS_URL, { signal: AbortSignal.timeout(10_000) })
if (!response.ok) throw new Error(`Command Code model catalog returned HTTP ${response.status}`)

const liveIds = modelIdsFromResponse(await response.json()).sort()
const fixture = JSON.parse(
  await readFile(new URL("../tests/fixtures/commandcode-model-ids.json", import.meta.url), "utf-8"),
) as CatalogFixture
const fixtureIds = [...fixture.modelIds].sort()
const pricedIds = Object.keys(MODEL_COSTS).sort()

assert.deepEqual(
  fixtureIds,
  liveIds,
  "Live Command Code model catalog drifted; refresh the model-id and pricing fixtures",
)
assert.deepEqual(
  pricedIds,
  liveIds,
  "Every live Command Code model must have an explicitly reviewed price entry",
)

console.log(`Command Code live catalog is current: ${liveIds.length} explicitly priced models.`)
