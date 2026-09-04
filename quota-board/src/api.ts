import type { DashboardData, RangeKey } from "./types"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getDashboard(range: RangeKey): Promise<DashboardData> {
  return request(`/api/dashboard?range=${range}`)
}

export interface AccountInput {
  label: string
  apiKey: string
  group: string | null
  refresh: boolean
}

export function verifyAccount(input: AccountInput) {
  return request<{
    email: string | null
    emailMasked: string
    login: string
    planId: string | null
    snapshot: DashboardData["accounts"][number]["snapshot"]
  }>("/api/accounts/verify", { method: "POST", body: JSON.stringify(input) })
}

export function addAccount(input: AccountInput): Promise<{ id: string }> {
  return request("/api/accounts", { method: "POST", body: JSON.stringify(input) })
}

export function refreshAll(): Promise<{ refreshed: number; failed: number }> {
  return request("/api/refresh", { method: "POST" })
}

export function refreshAccount(id: string): Promise<void> {
  return request(`/api/accounts/${id}/refresh`, { method: "POST" })
}

export function getAccountKey(id: string, exportToken: string): Promise<{ apiKey: string }> {
  return request(`/api/accounts/${id}/key`, {
    method: "POST",
    headers: { "x-quota-board-key-export-token": exportToken },
  })
}

export function removeAccount(id: string): Promise<void> {
  return request(`/api/accounts/${id}`, { method: "DELETE" })
}
