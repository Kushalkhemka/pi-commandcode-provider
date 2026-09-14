export interface UsageReport {
  eventId: string
  leaseId: string
  occurredAt: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  cost: number
  status: "completed" | "failed"
}

interface Item {
  token: string
  event: UsageReport
  bytes: number
  attempts: number
  createdAt: number
}

/** Bounded, best-effort telemetry. Never awaited by model generation. */
export class UsageQueue {
  private items: Item[] = []
  private bytes = 0
  private uploading = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private nextAttempt = 0
  private warnedAt = 0
  readonly stats = { queued: 0, sent: 0, dropped: 0, retries: 0 }

  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly maxBytes = 256 * 1024,
  ) {}

  enqueue(token: string, event: UsageReport): void {
    const bytes = Buffer.byteLength(JSON.stringify(event)) + Buffer.byteLength(token) + 128
    if (this.bytes + bytes > this.maxBytes) {
      this.drop(1)
      return
    }
    this.items.push({ token, event, bytes, attempts: 0, createdAt: Date.now() })
    this.bytes += bytes
    this.stats.queued++
    this.schedule(this.items.length >= 10 ? 0 : 2000)
  }

  private drop(count: number) {
    this.stats.dropped += count
    if (Date.now() - this.warnedAt > 60_000) {
      this.warnedAt = Date.now()
      console.warn(
        `[OpenSec telemetry] ${this.stats.dropped} events dropped; model requests are unaffected.`,
      )
    }
  }

  private schedule(delay: number) {
    if (this.uploading) return
    if (this.timer && delay !== 0) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(
      () => {
        this.timer = undefined
        void this.flush()
      },
      Math.max(delay, this.nextAttempt - Date.now()),
    )
    this.timer.unref?.()
  }

  async flush(): Promise<void> {
    if (this.uploading || !this.items.length) return
    this.items = this.items.filter((item) => {
      if (Date.now() - item.createdAt <= 300_000) return true
      this.bytes -= item.bytes
      this.drop(1)
      return false
    })
    if (!this.items.length) return
    if (Date.now() < this.nextAttempt) {
      this.schedule(this.nextAttempt - Date.now())
      return
    }
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    this.uploading = true
    const token = this.items[0].token
    const batch: Item[] = []
    this.items = this.items.filter((item) => {
      if (item.token !== token || batch.length >= 10) return true
      batch.push(item)
      return false
    })
    let retry = false
    let wait = 1000
    try {
      const response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ events: batch.map((item) => item.event) }),
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      })
      // Bound response handling; only status/headers are needed for acknowledgement.
      void response.body?.cancel().catch(() => undefined)
      if (response.ok) this.stats.sent += batch.length
      else {
        retry = response.status === 429 || response.status >= 500
        const header = response.headers.get("retry-after")
        if (header) {
          const seconds = Number(header)
          const duration = Number.isFinite(seconds)
            ? seconds * 1000
            : Date.parse(header) - Date.now()
          if (Number.isFinite(duration)) wait = Math.max(wait, duration)
        }
        if (!retry) this.drop(batch.length)
      }
    } catch {
      retry = true
    } finally {
      const retained: Item[] = []
      for (const item of batch) {
        if (retry && item.attempts < 4 && Date.now() - item.createdAt + wait < 300_000) {
          item.attempts++
          retained.push(item)
        } else {
          this.bytes -= item.bytes
          if (retry) this.drop(1)
        }
      }
      if (retained.length) {
        this.stats.retries += retained.length
        this.items.unshift(...retained)
        this.nextAttempt =
          Date.now() + Math.max(wait, 1000 * 2 ** retained[0].attempts + Math.random() * 500)
      } else this.nextAttempt = 0
      this.uploading = false
      if (this.items.length) this.schedule(2000)
    }
  }
}
