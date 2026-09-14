import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"

import { routerBaseUrl } from "../src/opensec-config.ts"
import { CommandCodeKeyLeaseManager } from "../src/key-lease.ts"
import type { AssistantMessageEvent } from "../src/types.ts"
import { makeModel } from "./helpers.ts"

const originalFetch = globalThis.fetch
const originalUrl = process.env.OPENSEC_ROUTER_URL
const originalToken = process.env.OPENSEC_ROUTER_TOKEN

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalUrl === undefined) delete process.env.OPENSEC_ROUTER_URL
  else process.env.OPENSEC_ROUTER_URL = originalUrl
  if (originalToken === undefined) delete process.env.OPENSEC_ROUTER_TOKEN
  else process.env.OPENSEC_ROUTER_TOKEN = originalToken
})

describe("OpenSec CommandCode key leasing", () => {
  it("routes saved member tokens without env variables and leaves direct keys untouched", async () => {
    delete process.env.OPENSEC_ROUTER_URL
    delete process.env.OPENSEC_ROUTER_TOKEN
    const token = "os_member_" + "a".repeat(43)
    let calls = 0
    globalThis.fetch = async (input, init) => {
      calls++
      assert.equal(String(input), "https://cc.opensec.in/api/router/lease")
      assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${token}`)
      return Response.json({
        leaseId: "lease",
        apiKey: "upstream",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      })
    }
    const manager = new CommandCodeKeyLeaseManager()
    const direct = { apiKey: "user_direct" }
    assert.equal(await manager.resolve(makeModel(), direct), direct)
    assert.equal(calls, 0)
    assert.equal((await manager.resolve(makeModel(), { apiKey: token }))?.apiKey, "upstream")
    assert.equal(calls, 1)
  })

  it("returns a cached key immediately while an expiring lease renews in the background", async () => {
    process.env.OPENSEC_ROUTER_URL = "https://router.test/cc"
    process.env.OPENSEC_ROUTER_TOKEN = "master-token"
    let leaseCalls = 0
    let releaseRenewal: (() => void) | undefined
    let renewalStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      renewalStarted = resolve
    })
    globalThis.fetch = async (input) => {
      if (!String(input).endsWith("/api/router/lease")) return new Response("ok")
      leaseCalls += 1
      if (leaseCalls > 1) {
        renewalStarted?.()
        await new Promise<void>((resolve) => {
          releaseRenewal = resolve
        })
      }
      return Response.json({
        leaseId: "00000000-0000-4000-8000-000000000001",
        sessionId: "session-1",
        accountId: "00000000-0000-4000-8000-000000000011",
        model: "model",
        apiKey: "upstream-key-1",
        keyFingerprint: "key_••••_00000001",
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (leaseCalls === 1 ? 10_000 : 300_000)).toISOString(),
      })
    }

    const manager = new CommandCodeKeyLeaseManager()
    await manager.resolve(makeModel(), { apiKey: "master-token", sessionId: "session-1" })
    const second = await Promise.race([
      manager.resolve(makeModel(), { apiKey: "master-token", sessionId: "session-1" }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("cached lease renewal blocked resolve")), 100),
      ),
    ])

    assert.equal(second?.apiKey, "upstream-key-1")
    await started
    assert.equal(leaseCalls, 2)
    releaseRenewal?.()
  })

  it("keeps a sticky session lease and rotates once before consuming a quota response", async () => {
    process.env.OPENSEC_ROUTER_URL = "https://router.test/cc"
    process.env.OPENSEC_ROUTER_TOKEN = "master-token"
    let leaseCalls = 0
    const providerKeys: string[] = []
    globalThis.fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/api/router/lease")) {
        leaseCalls += 1
        const body = JSON.parse(String(init?.body)) as { forceRotate?: boolean }
        const index = body.forceRotate ? 2 : 1
        return Response.json({
          leaseId: `00000000-0000-4000-8000-00000000000${index}`,
          sessionId: "session-1",
          accountId: `00000000-0000-4000-8000-00000000001${index}`,
          model: "model",
          apiKey: `upstream-key-${index}`,
          keyFingerprint: `key_••••_0000000${index}`,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
        })
      }
      const authorization = new Headers(init?.headers).get("authorization") ?? ""
      providerKeys.push(authorization)
      return new Response("ok", { status: providerKeys.length === 1 ? 402 : 200 })
    }

    const manager = new CommandCodeKeyLeaseManager()
    const options = await manager.resolve(makeModel(), {
      apiKey: "master-token",
      sessionId: "session-1",
    })
    assert.equal(options?.apiKey, "upstream-key-1")
    const response = await options?.fetch?.("https://api.commandcode.ai/provider/v1/chat", {
      headers: { authorization: "Bearer upstream-key-1" },
    })

    assert.equal(response?.status, 200)
    assert.equal(leaseCalls, 2)
    assert.deepEqual(providerKeys, ["Bearer upstream-key-1", "Bearer upstream-key-2"])
  })
  it("attributes simultaneous requests to their own lease even when member tokens share an upstream key", async () => {
    process.env.OPENSEC_ROUTER_URL = "https://router.test"
    delete process.env.OPENSEC_ROUTER_TOKEN
    const reports: { token: string; events: { leaseId: string; eventId: string }[] }[] = []
    const leases: string[] = []
    globalThis.fetch = async (input, init) => {
      const token = new Headers(init?.headers).get("authorization")!
      if (String(input).endsWith("/lease")) {
        const id = crypto.randomUUID()
        leases.push(id)
        return Response.json({
          leaseId: id,
          sessionId: "same",
          accountId: "shared",
          apiKey: "same-upstream-key",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        })
      }
      reports.push({ token, events: JSON.parse(String(init?.body)).events })
      return new Response(null, { status: 202 })
    }
    const manager = new CommandCodeKeyLeaseManager()
    const alice = await manager.resolve(makeModel(), { apiKey: "alice", sessionId: "same" })
    const bob = await manager.resolve(makeModel(), { apiKey: "bob", sessionId: "same" })
    const event: AssistantMessageEvent = {
      type: "done",
      reason: "stop",
      message: {
        role: "assistant",
        content: [],
        api: "test",
        provider: "commandcode",
        model: "test",
        timestamp: Date.now(),
        stopReason: "stop",
        usage: {
          input: 80,
          output: 20,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 100,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      },
    }
    bob?.onUsageEvent?.(event)
    alice?.onUsageEvent?.(event)
    alice?.onUsageEvent?.(event)
    await manager.flushUsage()
    await manager.flushUsage()
    assert.equal(reports.length, 2)
    assert.equal(reports[0].token, "Bearer bob")
    assert.equal(reports[0].events[0].leaseId, leases[1])
    assert.equal(reports[1].token, "Bearer alice")
    assert.equal(reports[1].events[0].leaseId, leases[0])
    assert.equal(reports[1].events.length, 1)
  })
})

describe("cache-preserving lease failures", () => {
  function lease(index: number, nearExpiry = false) {
    return {
      leaseId: `lease-${index}`,
      accountId: `account-${index}`,
      apiKey: `key-${index}`,
      expiresAt: new Date(Date.now() + (nearExpiry ? 1000 : 300000)).toISOString(),
    }
  }
  function setup() {
    process.env.OPENSEC_ROUTER_URL = "https://router.test"
    process.env.OPENSEC_ROUTER_TOKEN = "fixture"
    return new CommandCodeKeyLeaseManager((input, init) => globalThis.fetch(input, init))
  }
  it("retains the key for temporary 429/5xx responses and rotates for explicit quota exhaustion", async () => {
    const manager = setup()
    let calls = 0
    globalThis.fetch = async () => Response.json(lease(++calls))
    for (const [status, body] of [
      [429, "Too many requests"],
      [429, "rate_limit_exceeded"],
      [503, "unavailable"],
      [403, "model access denied"],
    ] as const) {
      const options = await manager.resolve(makeModel(), {
        sessionId: "sticky",
        fetch: async () => new Response(body, { status }),
      })
      assert.equal((await options!.fetch!("https://provider.test"))!.status, status)
      assert.equal(calls, 1)
    }
    const keys: string[] = []
    const options = await manager.resolve(makeModel(), {
      sessionId: "sticky",
      fetch: async (_, init) => {
        keys.push(new Headers(init?.headers).get("authorization")!)
        return new Response("insufficient_quota", { status: keys.length === 1 ? 429 : 200 })
      },
    })
    await options!.fetch!("https://provider.test", { headers: { authorization: "Bearer key-1" } })
    await options!.fetch!("https://provider.test", { headers: { authorization: "Bearer key-1" } })
    assert.equal(calls, 2)
    assert.deepEqual(keys, ["Bearer key-1", "Bearer key-2", "Bearer key-2"])
  })
  it("preserves Request headers and updates both provider authentication headers on retries", async () => {
    const manager = setup()
    let calls = 0
    globalThis.fetch = async () => Response.json(lease(++calls))
    const options = await manager.resolve(makeModel(), {
      sessionId: "headers",
      fetch: async (_input, init) => {
        const headers = new Headers(init?.headers)
        assert.equal(headers.get("x-session-id"), "stable-session")
        assert.equal(headers.get("x-api-key"), headers.get("authorization")!.slice(7))
        return new Response("quota", { status: headers.get("x-api-key") === "key-1" ? 402 : 200 })
      },
    })
    const request = new Request("https://provider.test", {
      headers: { "x-api-key": "stale", "x-session-id": "stable-session" },
    })
    assert.equal((await options!.fetch!(request)).status, 200)
    assert.equal(calls, 2)
  })
  it("coalesces 32 acquisitions and late failures into one replacement", async () => {
    const manager = setup()
    let calls = 0
    globalThis.fetch = async () => Response.json(lease(++calls))
    let failed = 0,
      release!: () => void
    const barrier = new Promise<void>((r) => {
      release = r
    })
    const fetchProvider = async (_: unknown, init?: RequestInit) => {
      if (new Headers(init?.headers).get("authorization") === "Bearer key-1") {
        if (++failed === 32) release()
        await barrier
        return new Response("exhausted", { status: 402 })
      }
      return new Response("ok")
    }
    const requests = await Promise.all(
      Array.from({ length: 32 }, () =>
        manager.resolve(makeModel(), { sessionId: "same", fetch: fetchProvider }),
      ),
    )
    assert.equal(calls, 1)
    const responses = await Promise.all(
      requests.map((options) => options!.fetch!("https://provider.test")),
    )
    assert.equal(
      responses.every((r) => r.status === 200),
      true,
    )
    assert.equal(calls, 2)
    await requests[0]!.fetch!("https://provider.test", {
      headers: { authorization: "Bearer key-1" },
    })
    assert.equal(calls, 2)
  })
  it("does not let a delayed background renewal overwrite a completed rotation", async () => {
    const manager = setup()
    let calls = 0,
      release!: () => void
    const delayed = new Promise<void>((r) => {
      release = r
    })
    globalThis.fetch = async (_, init) => {
      calls++
      if (JSON.parse(String(init?.body)).forceRotate) return Response.json(lease(2))
      if (calls > 1) await delayed
      return Response.json(lease(1, true))
    }
    let attempts = 0
    const provider = async () => new Response("quota", { status: ++attempts === 1 ? 402 : 200 })
    await manager.resolve(makeModel(), { sessionId: "same", fetch: provider })
    const options = await manager.resolve(makeModel(), { sessionId: "same", fetch: provider })
    await options!.fetch!("https://provider.test")
    release()
    await new Promise((r) => setTimeout(r, 0))
    assert.equal((await manager.resolve(makeModel(), { sessionId: "same" }))!.apiKey, "key-2")
    assert.equal(calls, 3)
  })
})

describe("OpenSec credential destination boundaries", () => {
  it("allows HTTPS and literal loopback only, without URL credentials or hidden components", () => {
    assert.equal(routerBaseUrl(), "https://cc.opensec.in")
    assert.equal(routerBaseUrl("https://router.test/cc/"), "https://router.test/cc")
    assert.equal(routerBaseUrl("http://127.0.0.1:8787"), "http://127.0.0.1:8787")
    for (const url of [
      "http://router.test",
      "ftp://router.test",
      "https://user:password@router.test",
      "https://router.test?token=secret",
      "https://router.test#fragment",
      "not-a-url",
    ])
      assert.throws(() => routerBaseUrl(url))
  })
  it("disables lease redirects and never exposes a router error body in Pi", async () => {
    process.env.OPENSEC_ROUTER_URL = "https://router.test"
    process.env.OPENSEC_ROUTER_TOKEN = "fixture-secret"
    const manager = new CommandCodeKeyLeaseManager(async (_url, init) => {
      assert.equal(init?.redirect, "error")
      return Response.json({ error: "echoed fixture-secret" }, { status: 401 })
    })
    await assert.rejects(manager.resolve(makeModel(), { sessionId: "failure" }), (error) => {
      assert.match(String(error), /request failed \(401\)/)
      assert.doesNotMatch(String(error), /fixture-secret|echoed/)
      return true
    })
  })
})
