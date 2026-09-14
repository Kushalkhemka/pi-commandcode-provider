import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { UsageQueue, type UsageReport } from "../src/usage-queue.ts"

const originalNow = Date.now
afterEach(() => {
  Date.now = originalNow
})
const report = (id = crypto.randomUUID()): UsageReport => ({
  eventId: id,
  leaseId: crypto.randomUUID(),
  occurredAt: new Date().toISOString(),
  model: "test",
  inputTokens: 10,
  outputTokens: 5,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  cost: 0,
  status: "completed",
})

describe("bounded OpenSec usage reporting", () => {
  it("batches without mixing member credentials and keeps stable IDs across retry", async () => {
    let now = originalNow()
    Date.now = () => now
    const received: { token: string; body: { events: UsageReport[] } }[] = []
    const queue = new UsageQueue("https://router.test/api/router/usage", async (_url, init) => {
      assert.equal(init?.redirect, "error")
      received.push({
        token: new Headers(init?.headers).get("authorization")!,
        body: JSON.parse(String(init?.body)),
      })
      return new Response(null, { status: received.length === 1 ? 503 : 202 })
    })
    const first = report()
    queue.enqueue("alice", first)
    queue.enqueue("bob", report())
    queue.enqueue("alice", report())
    await queue.flush()
    assert.equal(received[0].body.events.length, 2)
    now += 5000
    await queue.flush()
    await queue.flush()
    assert.equal(received[0].token, "Bearer alice")
    assert.equal(received[1].body.events[0].eventId, first.eventId)
    assert.equal(received[2].token, "Bearer bob")
    assert.equal(queue.stats.sent, 3)
  })
  it("counts in-flight bytes toward the cap and permits only one upload", async () => {
    let release!: () => void
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    const queue = new UsageQueue(
      "https://router.test",
      async () => {
        calls++
        await blocked
        return new Response(null, { status: 202 })
      },
      1024,
    )
    queue.enqueue("alice", report())
    const pending = queue.flush()
    for (let i = 0; i < 100; i++) queue.enqueue("alice", report())
    await queue.flush()
    assert.equal(calls, 1)
    assert.ok(queue.stats.dropped > 90)
    release()
    await pending
    await queue.flush()
  })
  it("does not retry permanent rejection and honors Retry-After", async () => {
    let now = originalNow()
    Date.now = () => now
    let calls = 0
    const queue = new UsageQueue("https://router.test", async () => {
      calls++
      return new Response(null, {
        status: calls === 1 ? 429 : 401,
        headers: { "Retry-After": "60" },
      })
    })
    queue.enqueue("alice", report())
    await queue.flush()
    now += 30_000
    await queue.flush()
    assert.equal(calls, 1)
    now += 31_000
    await queue.flush()
    await queue.flush()
    assert.equal(calls, 2)
    assert.equal(queue.stats.dropped, 1)
  })
})

describe("bounded shutdown drain", () => {
  it("drains multiple batches and member tokens", async () => {
    const batches: number[] = []
    const queue = new UsageQueue("https://router.test", async (_url, init) => {
      batches.push(JSON.parse(String(init?.body)).events.length)
      return new Response(null, { status: 202 })
    })
    for (let i = 0; i < 25; i++) queue.enqueue(i < 18 ? "alice" : "bob", report())
    await queue.shutdown()
    assert.deepEqual(batches, [10, 8, 7])
    assert.equal(queue.stats.sent, 25)
    assert.equal(queue.stats.dropped, 0)
  })
  it("waits for an active upload then drains the remaining batch", async () => {
    let release!: () => void,
      calls = 0
    const ready = new Promise<void>((resolve) => {
      release = resolve
    })
    const queue = new UsageQueue("https://router.test", async () => {
      if (++calls === 1) await ready
      return new Response(null, { status: 202 })
    })
    for (let i = 0; i < 15; i++) queue.enqueue("member", report())
    const upload = queue.flush()
    const drain = queue.shutdown()
    release()
    await Promise.all([upload, drain])
    assert.equal(calls, 2)
    assert.equal(queue.stats.sent, 15)
  })
  it("honors backoff instead of uploading again during a short shutdown deadline", async () => {
    let calls = 0
    const queue = new UsageQueue("https://router.test", async () => {
      calls++
      return new Response(null, { status: 429, headers: { "retry-after": "60" } })
    })
    queue.enqueue("member", report())
    await queue.flush()
    const start = performance.now()
    await queue.shutdown(30)
    assert.equal(calls, 1)
    assert.ok(performance.now() - start < 500)
    assert.equal(queue.stats.dropped, 1)
  })
  it("aborts an active upload when its shutdown deadline expires", async () => {
    let aborted = false
    const queue = new UsageQueue("https://router.test", async (_url, init) => {
      await new Promise<void>((resolve) =>
        init!.signal!.addEventListener(
          "abort",
          () => {
            aborted = true
            resolve()
          },
          { once: true },
        ),
      )
      throw new Error("aborted")
    })
    queue.enqueue("member", report())
    const upload = queue.flush()
    await queue.shutdown(30)
    await upload
    assert.equal(aborted, true)
    assert.equal(queue.stats.dropped, 1)
  })
})
