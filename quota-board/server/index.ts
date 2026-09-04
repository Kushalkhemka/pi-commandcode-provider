import { randomUUID, timingSafeEqual } from "node:crypto"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"
import express from "express"
import { z } from "zod"
import type { RangeKey, UsageSnapshot } from "../src/types"
import { dashboardData, telemetryFor } from "./analytics"
import { CommandCodeRequestError, ENDPOINTS, fetchAccountSnapshot } from "./commandcode"
import { JsonStore } from "./store"
import type { StoredAccount, TelemetryEvent } from "./types"
import { decryptSecret, encryptSecret, keyFingerprint, loadMasterKey } from "./vault"

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dataDir = resolve(process.env.QUOTA_BOARD_DATA_DIR ?? join(rootDir, "data"))
const host = process.env.QUOTA_BOARD_HOST ?? "127.0.0.1"
const port = Number(process.env.QUOTA_BOARD_PORT ?? 8787)
const app = express()
const store = new JsonStore(dataDir)
const masterKey = await loadMasterKey(dataDir)

class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

await store.init()
app.disable("x-powered-by")
app.use(express.json({ limit: "128kb" }))

const accountInput = z.object({
  label: z.string().trim().max(80).optional().default(""),
  apiKey: z.string().trim().min(12).max(512),
  group: z.string().trim().max(80).nullable().optional(),
  refresh: z.boolean().optional().default(true),
})

const telemetryInput = z
  .object({
    accountId: z.string().uuid().optional(),
    keyFingerprint: z
      .string()
      .regex(/^key_••••_[a-f0-9]{8}$/)
      .optional(),
    occurredAt: z.string().datetime().optional(),
    model: z.string().trim().min(1).max(160),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative().default(0),
    cacheWriteTokens: z.number().int().nonnegative().default(0),
    cost: z.number().nonnegative().default(0),
    status: z.enum(["completed", "failed"]).default("completed"),
  })
  .refine((value) => Boolean(value.accountId || value.keyFingerprint), {
    message: "accountId or keyFingerprint is required",
  })

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unexpected error"
  return message.replace(/(?:user_|cmd_|sk-)[A-Za-z0-9_-]{8,}/g, "[redacted]")
}

function findAccount(accounts: StoredAccount[], id: string): StoredAccount {
  const account = accounts.find((item) => item.id === id)
  if (!account) throw new AppError("Account not found", 404)
  return account
}

function applySnapshot(
  account: StoredAccount,
  snapshot: UsageSnapshot,
  live: Awaited<ReturnType<typeof fetchAccountSnapshot>>,
): void {
  account.emailMasked = live.emailMasked
  account.email = live.email || null
  account.login = live.login
  account.planId = live.planId
  account.subscriptionStatus = live.subscriptionStatus
  account.periodEnd = live.periodEnd
  account.status = "healthy"
  account.lastSyncAt = snapshot.capturedAt
  account.error = null
  account.updatedAt = snapshot.capturedAt
}

async function refreshAccount(id: string): Promise<void> {
  const database = await store.read()
  const account = findAccount(database.accounts, id)
  const apiKey = decryptSecret(account.encryptedKey, masterKey)
  try {
    const telemetry = telemetryFor(database.telemetry, id)
    const live = await fetchAccountSnapshot(apiKey, telemetry)
    await store.update((current) => {
      const target = findAccount(current.accounts, id)
      applySnapshot(target, live.snapshot, live)
      const history = current.snapshots[id] ?? []
      history.push(live.snapshot)
      current.snapshots[id] = history.slice(-2_000)
    })
  } catch (error) {
    await store.update((current) => {
      const target = findAccount(current.accounts, id)
      target.status = "error"
      target.error = safeMessage(error)
      target.updatedAt = new Date().toISOString()
    })
    throw error
  }
}

async function mapConcurrent<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<{ completed: number; failed: number }> {
  let cursor = 0
  let completed = 0
  let failed = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const item = items[cursor]
        cursor += 1
        try {
          await task(item)
          completed += 1
        } catch {
          failed += 1
        }
      }
    }),
  )
  return { completed, failed }
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "CommandCode Quota Board" })
})

app.get("/api/endpoints", (_request, response) => {
  response.json({ endpoints: ENDPOINTS })
})

app.get("/api/dashboard", async (request, response, next) => {
  try {
    const range = z.enum(["24h", "7d", "30d"]).catch("24h").parse(request.query.range) as RangeKey
    response.json(dashboardData(await store.read(), range))
  } catch (error) {
    next(error)
  }
})

app.post("/api/accounts/verify", async (request, response, next) => {
  try {
    const input = accountInput.parse(request.body)
    const live = await fetchAccountSnapshot(input.apiKey, {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      models: [],
      eventCount: 0,
    })
    response.json({
      email: live.email || null,
      emailMasked: live.emailMasked,
      login: live.login,
      planId: live.planId,
      snapshot: live.snapshot,
    })
  } catch (error) {
    next(error)
  }
})

app.post("/api/accounts", async (request, response, next) => {
  try {
    const input = accountInput.parse(request.body)
    const fingerprint = keyFingerprint(input.apiKey)
    if ((await store.read()).accounts.some((account) => account.keyFingerprint === fingerprint)) {
      throw new AppError("This API key is already connected", 409)
    }
    const live = await fetchAccountSnapshot(input.apiKey, {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      models: [],
      eventCount: 0,
    })
    const now = new Date().toISOString()
    const account: StoredAccount = {
      id: randomUUID(),
      label: input.label || live.login,
      group: input.group || null,
      encryptedKey: encryptSecret(input.apiKey, masterKey),
      keyFingerprint: fingerprint,
      createdAt: now,
      updatedAt: now,
      email: live.email || null,
      emailMasked: live.emailMasked,
      login: live.login,
      planId: live.planId,
      subscriptionStatus: live.subscriptionStatus,
      periodEnd: live.periodEnd,
      status: "healthy",
      lastSyncAt: live.snapshot.capturedAt,
      error: null,
    }
    await store.update((database) => {
      database.accounts.push(account)
      database.snapshots[account.id] = [live.snapshot]
    })
    response.status(201).json({ id: account.id })
  } catch (error) {
    next(error)
  }
})

app.post("/api/accounts/:id/refresh", async (request, response, next) => {
  try {
    await refreshAccount(z.string().uuid().parse(request.params.id))
    response.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post("/api/refresh", async (_request, response, next) => {
  try {
    const ids = (await store.read()).accounts.map((account) => account.id)
    const result = await mapConcurrent(ids, 4, refreshAccount)
    response.json({ ok: result.failed === 0, refreshed: result.completed, failed: result.failed })
  } catch (error) {
    next(error)
  }
})

app.delete("/api/accounts/:id", async (request, response, next) => {
  try {
    const id = z.string().uuid().parse(request.params.id)
    await store.update((database) => {
      database.accounts = database.accounts.filter((account) => account.id !== id)
      delete database.snapshots[id]
      database.telemetry = database.telemetry.filter((event) => event.accountId !== id)
    })
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

function authorizedTelemetry(request: express.Request): boolean {
  const configured = process.env.QUOTA_BOARD_INGEST_TOKEN
  if (!configured) return request.ip === "127.0.0.1" || request.ip === "::1"
  const supplied = request.header("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const expected = Buffer.from(configured)
  const actual = Buffer.from(supplied)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

app.post("/api/telemetry", async (request, response, next) => {
  try {
    if (!authorizedTelemetry(request)) {
      response.status(401).json({ error: "Telemetry ingestion is not authorized" })
      return
    }
    const input = telemetryInput.parse(request.body)
    const database = await store.read()
    const account = input.accountId
      ? findAccount(database.accounts, input.accountId)
      : database.accounts.find((item) => item.keyFingerprint === input.keyFingerprint)
    if (!account) throw new AppError("Telemetry account not found", 404)
    const event: TelemetryEvent = {
      id: randomUUID(),
      accountId: account.id,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cacheReadTokens: input.cacheReadTokens,
      cacheWriteTokens: input.cacheWriteTokens,
      cost: input.cost,
      status: input.status,
    }
    await store.update((current) => {
      current.telemetry.push(event)
      current.telemetry = current.telemetry.slice(-100_000)
    })
    response.status(202).json({ id: event.id })
  } catch (error) {
    next(error)
  }
})

const distDir = join(rootDir, "dist")
app.use(express.static(distDir))
app.get("/{*path}", (_request, response) => response.sendFile(join(distDir, "index.html")))

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const status =
      error instanceof z.ZodError
        ? 400
        : error instanceof AppError || error instanceof CommandCodeRequestError
          ? error.status
          : 502
    response.status(status).json({ error: safeMessage(error) })
  },
)

app.listen(port, host, () => {
  console.log(`CommandCode Quota Board listening on http://${host}:${port}`)
})
