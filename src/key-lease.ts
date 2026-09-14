import { createHash } from "node:crypto"
import { isOpenSecMemberToken, routerBaseUrl } from "./opensec-config.ts"
import { UsageQueue } from "./usage-queue.ts"
import type { ModelLike, StreamOptions } from "./types.ts"

interface KeyLease {
  leaseId: string
  sessionId: string
  accountId: string
  model: string
  apiKey: string
  keyFingerprint: string
  issuedAt: string
  expiresAt: string
}

interface LeaseRequest {
  sessionId: string
  model: string
  forceRotate?: boolean
  excludeAccountId?: string
  expectedLeaseId?: string
}

const RENEWAL_WINDOW_MS = 60_000

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`
}

function isQuotaFailure(response: Response): Promise<boolean> {
  if ([401, 402].includes(response.status)) return Promise.resolve(true)
  if (![403, 429].includes(response.status)) return Promise.resolve(false)
  return response
    .clone()
    .text()
    .then(
      // Temporary throttling should use the core's Retry-After/backoff on the
      // same key. Only an explicit capacity failure justifies losing affinity.
      (body) =>
        !/rate[_ -]?limit|too many requests|per[_ -]minute/i.test(body) &&
        /quota|credits?|usage[_ -]?limit|exhausted|insufficient[_ -]?balance/i.test(body),
      () => false,
    )
}

function replaceAuthorization(
  init: RequestInit | undefined,
  apiKey: string,
  input: RequestInfo | URL,
): RequestInit {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  )
  if (headers.has("x-api-key")) headers.set("x-api-key", apiKey)
  headers.set("authorization", `Bearer ${apiKey}`)
  return { ...init, headers }
}

export class CommandCodeKeyLeaseManager {
  private readonly explicitRouter = Boolean(process.env.OPENSEC_ROUTER_URL?.trim())
  private readonly baseUrl = routerBaseUrl(process.env.OPENSEC_ROUTER_URL?.trim() || undefined)
  private readonly configuredToken = process.env.OPENSEC_ROUTER_TOKEN?.trim()
  private readonly leases = new Map<string, KeyLease>()
  private readonly queue = this.baseUrl
    ? new UsageQueue(joinUrl(this.baseUrl, "/api/router/usage"))
    : undefined
  private readonly renewalAfter = new Map<string, number>()
  private readonly inFlight = new Map<string, Promise<KeyLease>>()
  private readonly fallbackSession = `pi-${process.pid}-${crypto.randomUUID()}`

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  get enabled(): boolean {
    return this.explicitRouter || isOpenSecMemberToken(this.configuredToken)
  }

  async resolve(model: ModelLike, options?: StreamOptions): Promise<StreamOptions | undefined> {
    const token = this.configuredToken || options?.apiKey
    if (!this.explicitRouter && !isOpenSecMemberToken(token)) return options
    if (!token)
      throw new Error("OpenSec routing requires OPENSEC_ROUTER_TOKEN or a configured provider key")
    const sessionId = options?.sessionId || this.fallbackSession
    const cacheKey = createHash("sha256").update(token).digest("hex") + ":" + sessionId
    let lease = await this.acquire({ sessionId, model: model.id }, token)
    const fetchImpl = options?.fetch ?? fetch
    const eventId = crypto.randomUUID()
    let reported = false
    const routed: StreamOptions = {
      ...options,
      apiKey: lease.apiKey,
      onUsageEvent: (event) => {
        if (reported || (event.type !== "done" && event.type !== "error")) return
        reported = true
        const message = event.type === "done" ? event.message : event.error
        this.queue?.enqueue(token, {
          eventId,
          leaseId: lease.leaseId,
          occurredAt: new Date().toISOString(),
          model: model.id,
          inputTokens: message.usage.input,
          outputTokens: message.usage.output,
          cacheReadTokens: message.usage.cacheRead,
          cacheWriteTokens: message.usage.cacheWrite,
          cost: message.usage.cost.total,
          status: event.type === "done" ? "completed" : "failed",
        })
      },
      fetch: async (input, init) => {
        // Core retries may retain the original headers, while another request
        // has already replaced this session's failed key.
        lease = this.leases.get(cacheKey) ?? lease
        routed.apiKey = lease.apiKey
        const attempted = lease
        let response = await fetchImpl(input, replaceAuthorization(init, attempted.apiKey, input))
        if (!(await isQuotaFailure(response))) return response
        // Core receives only the replacement; release the abandoned response
        // even if lease allocation subsequently fails.
        void response.body?.cancel().catch(() => undefined)
        const replacement = await this.acquire(
          {
            sessionId,
            model: model.id,
            forceRotate: true,
            excludeAccountId: attempted.accountId,
            expectedLeaseId: attempted.leaseId,
          },
          token,
        )
        lease = replacement
        routed.apiKey = replacement.apiKey
        response = await fetchImpl(input, replaceAuthorization(init, replacement.apiKey, input))
        return response
      },
    }
    return routed
  }

  async flushUsage(): Promise<void> {
    await this.queue?.flush()
  }
  get telemetryStats() {
    return this.queue?.stats
  }

  private async acquire(request: LeaseRequest, token: string): Promise<KeyLease> {
    return this.acquireInternal(request, token, false)
  }

  private async acquireInternal(
    request: LeaseRequest,
    token: string,
    bypassCache: boolean,
  ): Promise<KeyLease> {
    const cacheKey = createHash("sha256").update(token).digest("hex") + ":" + request.sessionId
    const cached = this.leases.get(cacheKey)
    if (
      request.forceRotate &&
      cached &&
      ((request.expectedLeaseId && cached.leaseId !== request.expectedLeaseId) ||
        (request.excludeAccountId && cached.accountId !== request.excludeAccountId))
    )
      return cached
    if (!request.forceRotate && cached && !bypassCache) {
      if (
        Date.parse(cached.expiresAt) <= Date.now() + RENEWAL_WINDOW_MS &&
        Date.now() >= (this.renewalAfter.get(cacheKey) ?? 0)
      ) {
        this.renewalAfter.set(cacheKey, Date.now() + 60_000)
        void this.acquireInternal(request, token, true).catch(() => undefined)
      }
      return cached
    }
    if (!this.baseUrl) throw new Error("OpenSec router URL is not configured")
    const requestKey = `${cacheKey}:${request.forceRotate ? `rotate:${request.expectedLeaseId ?? request.excludeAccountId ?? ""}` : bypassCache ? "renew" : "lease"}`
    const pending = this.inFlight.get(requestKey)
    if (pending) return pending
    const task = (async () => {
      const response = await this.fetchImpl(joinUrl(this.baseUrl!, "/api/router/lease"), {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      })
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined)
        // The remote error body may echo credentials; never surface it in Pi.
        throw new Error(`OpenSec router request failed (${response.status})`)
      }
      const lease = (await response.json()) as KeyLease
      // A slower renewal must not overwrite a rotation that finished meanwhile.
      const latest = this.leases.get(cacheKey)
      if (latest && latest.leaseId !== cached?.leaseId) return latest
      if (!this.leases.has(cacheKey) && this.leases.size >= 512) {
        const oldest = this.leases.keys().next().value!
        this.leases.delete(oldest)
        this.renewalAfter.delete(oldest)
      }
      this.leases.set(cacheKey, lease)
      return lease
    })().finally(() => this.inFlight.delete(requestKey))
    this.inFlight.set(requestKey, task)
    return task
  }
}
