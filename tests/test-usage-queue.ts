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
