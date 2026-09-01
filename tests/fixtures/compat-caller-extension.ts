/**
 * Test fixture: a sibling extension that streams through the pi-ai compat
 * entrypoint with the active session model, the way background-agent
 * extensions do. Registers `/compat-call` so the test can drive it over RPC.
 */

import { streamSimple } from "@earendil-works/pi-ai/compat"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"

export default function (pi: ExtensionAPI) {
  pi.registerCommand("compat-call", {
    description: "Stream through @earendil-works/pi-ai/compat with the session model",
    handler: async (_args, ctx) => {
      const model = ctx.model
      if (!model) {
        ctx.ui.notify("compat-call: no active model", "error")
        return
      }
      try {
        const message = await streamSimple(model, {
          messages: [{ role: "user", content: "say mock token", timestamp: Date.now() }],
        }).result()
        const text = message.content
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join("")
        ctx.ui.notify(`compat-call ok: ${text}`, "info")
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        ctx.ui.notify(`compat-call failed: ${detail}`, "error")
      }
    },
  })
}
