import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  commandCodeModelMetadataFromContents,
  diffModelMetadata,
  hasModelMetadataDiff,
  parseBundleModelCapabilities,
  parseKnownTextOnlyModelIds,
  parseModelsReference,
  parsePackageVersion,
  renderCommandCodeCatalog,
  updateReadmeCatalogVersion,
  type CommandCodeModelMetadata,
} from "../.github/scripts/check-commandcode-model-metadata.ts"

const MODELS_REFERENCE = `
| Id (use EXACTLY this) | Name | Context | Efforts | $/1M in/out · cache read | Min plan | Best for |
|---|---|---|---|---|---|---|
| \`vision-model\` | Vision | 1M | low, high | $1/$2 | Go | images |
| \`text-model\` | Text | 200K | — | $1/$2 | Go | text |
`

const CLI_BUNDLE =
  'const V={id:"vision-model",inputModalities:["text","image"],reasoning:!0,reasoningEfforts:["low","high"],maxOutputTokens:32768},T={id:"text-model",inputModalities:["text"]},catalog=new Set(["text-model"]),__name(isKnownTextOnlyModel,"isKnownTextOnlyModel")'

describe("Command Code model metadata checker", () => {
  it("parses model ids and reasoning efforts from the generated reference", () => {
    assert.deepEqual(parseModelsReference(MODELS_REFERENCE), {
      modelIds: ["text-model", "vision-model"],
      reasoningEfforts: { "vision-model": ["low", "high"] },
    })
  })

  it("extracts the text-only set from the bundled CLI catalog", () => {
    assert.deepEqual(parseKnownTextOnlyModelIds(CLI_BUNDLE), ["text-model"])
  })

  it("accepts one exact npm registry version and rejects stale-looking output shapes", () => {
    assert.equal(parsePackageVersion("1.32.2"), "1.32.2")
    assert.equal(parsePackageVersion("2.0.0-beta.1"), "2.0.0-beta.1")
    assert.throws(() => parsePackageVersion(["1.32.1", "1.32.2"]), /one semantic version/)
    assert.throws(() => parsePackageVersion("latest"), /one semantic version/)
  })

  it("derives image, reasoning, effort, and output-limit metadata", () => {
    assert.deepEqual(parseBundleModelCapabilities(CLI_BUNDLE, ["text-model", "vision-model"]), {
      reasoningModelIds: ["vision-model"],
      maxOutputTokens: { "vision-model": 32_768 },
    })
    assert.deepEqual(commandCodeModelMetadataFromContents(MODELS_REFERENCE, CLI_BUNDLE), {
      imageModelIds: ["vision-model"],
      reasoningModelIds: ["vision-model"],
      reasoningEfforts: { "vision-model": ["low", "high"] },
      maxOutputTokens: { "vision-model": 32_768 },
    })
  })

  it("reports additions, removals, and changed reasoning efforts", () => {
    const current: CommandCodeModelMetadata = {
      imageModelIds: ["removed-image", "stable-image"],
      reasoningModelIds: ["removed-reasoning", "stable-reasoning"],
      reasoningEfforts: {
        "changed-effort": ["low"],
        "removed-effort": ["high"],
        "stable-effort": ["low", "high"],
      },
      maxOutputTokens: { "changed-output": 1, "removed-output": 2, "stable-output": 3 },
    }
    const upstream: CommandCodeModelMetadata = {
      imageModelIds: ["added-image", "stable-image"],
      reasoningModelIds: ["added-reasoning", "stable-reasoning"],
      reasoningEfforts: {
        "added-effort": ["max"],
        "changed-effort": ["low", "high"],
        "stable-effort": ["low", "high"],
      },
      maxOutputTokens: { "added-output": 4, "changed-output": 5, "stable-output": 3 },
    }

    const diff = diffModelMetadata(current, upstream)

    assert.deepEqual(diff, {
      versionChanged: false,
      addedImageModelIds: ["added-image"],
      removedImageModelIds: ["removed-image"],
      addedReasoningModelIds: ["added-reasoning"],
      removedReasoningModelIds: ["removed-reasoning"],
      addedEffortModelIds: ["added-effort"],
      removedEffortModelIds: ["removed-effort"],
      changedEffortModelIds: ["changed-effort"],
      addedMaxOutputModelIds: ["added-output"],
      removedMaxOutputModelIds: ["removed-output"],
      changedMaxOutputModelIds: ["changed-output"],
    })
    assert.equal(hasModelMetadataDiff(diff), true)
  })

  it("reports CLI version drift even when model metadata is unchanged", () => {
    const metadata: CommandCodeModelMetadata = {
      imageModelIds: ["vision-model"],
      reasoningModelIds: ["vision-model"],
      reasoningEfforts: { "vision-model": ["low"] },
      maxOutputTokens: { "vision-model": 32_768 },
    }

    const diff = diffModelMetadata(metadata, metadata, "1.32.2", "1.33.0")

    assert.equal(diff.versionChanged, true)
    assert.equal(hasModelMetadataDiff(diff), true)
  })

  it("renders a deterministic generated catalog and updates the README version", () => {
    assert.equal(
      renderCommandCodeCatalog("1.33.0", {
        imageModelIds: ["b-model", "a-model"],
        reasoningModelIds: ["c-model", "a-model"],
        reasoningEfforts: {
          "b-model": ["high", "max"],
          "a-model": ["low"],
        },
        maxOutputTokens: { "b-model": 32_768 },
      }),
      `export const COMMAND_CODE_CLI_VERSION = "1.33.0"

export type CommandCodeInputType = "text" | "image"
export type CommandCodeReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh" | "max"

/**
 * Generated from command-code@1.33.0 by \`npm run sync:commandcode-catalog\`.
 * Do not edit manually.
 */
export const MODEL_INPUT_MODALITIES: Readonly<Record<string, readonly CommandCodeInputType[]>> = {
  "a-model": ["text", "image"],
  "b-model": ["text", "image"],
}

export const MODEL_REASONING: Readonly<Record<string, true>> = {
  "a-model": true,
  "c-model": true,
}

export const MODEL_EFFORTS: Readonly<Record<string, readonly CommandCodeReasoningEffort[]>> = {
  "a-model": ["low"],
  "b-model": ["high", "max"],
}

export const MODEL_MAX_OUTPUT_TOKENS: Readonly<Record<string, number>> = {
  "b-model": 32_768,
}
`,
    )
    assert.equal(
      updateReadmeCatalogVersion(
        "The capability snapshot currently follows `command-code@1.32.2`.",
        "1.33.0",
      ),
      "The capability snapshot currently follows `command-code@1.33.0`.",
    )
  })

  it("rejects unexpected upstream structures instead of silently passing", () => {
    assert.throws(() => parseModelsReference("# no catalog"), /No model rows/)
    assert.throws(
      () => parseModelsReference(MODELS_REFERENCE.replace("low, high", "low, turbo")),
      /Unexpected reasoning efforts/,
    )
    assert.throws(() => parseKnownTextOnlyModelIds("const unrelated = true"), /Could not find/)
  })
})
