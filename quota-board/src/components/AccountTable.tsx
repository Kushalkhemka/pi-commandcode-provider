import { Check, ChevronDown, CircleDollarSign, Copy, MoreHorizontal } from "lucide-react"
import type { AccountView } from "../types"
import { Progress, toneFor } from "./Progress"

function compact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  return value.toLocaleString()
}

function planName(value: string | null): string {
  if (!value) return "—"
  return value
    .replace(/^individual-/, "")
    .replace(/-v\d+$/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function windowValue(account: AccountView, name: "fiveHour" | "weekly") {
  return account.snapshot?.windows.find((window) => window.name === name) ?? null
}

function avatarFor(account: AccountView): string {
  const seed = account.keyFingerprint
  let hash = 0
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return `/avatars/avatar-${String((hash % 50) + 1).padStart(2, "0")}.svg`
}

export function AccountTable({
  accounts,
  selectedId,
  onSelect,
  onCopyKey,
  copiedId,
}: {
  accounts: AccountView[]
  selectedId: string | null
  onSelect: (account: AccountView) => void
  onCopyKey: (account: AccountView) => void
  copiedId: string | null
}) {
  if (accounts.length === 0) {
    return (
      <div className="accounts-empty">
        <strong>No accounts connected</strong>
        <span>Add a CommandCode API key to start monitoring quotas.</span>
      </div>
    )
  }
  return (
    <div className="account-table" role="table" aria-label="CommandCode accounts">
      <div className="account-table__head" role="row">
        <span>Account</span><span>Plan</span><span>5-hour</span><span>Weekly</span>
        <span>Monthly left</span><span>Tokens</span><span>Cache hit</span><span>Status</span><span />
      </div>
      {accounts.map((account) => {
        const five = windowValue(account, "fiveHour")
        const weekly = windowValue(account, "weekly")
        const monthlyRate = account.snapshot?.monthlyCap
          ? 1 - account.snapshot.monthlyRemaining / account.snapshot.monthlyCap
          : 0
        const observedInput = account.snapshot?.models.reduce((sum, model) => sum + model.inputTokens, 0) ?? 0
        const cacheDenominator = account.snapshot ? observedInput + account.snapshot.cacheReadTokens : 0
        const cacheRate =
          cacheDenominator > 0 && account.snapshot
            ? account.snapshot.cacheReadTokens / cacheDenominator
            : null
        return (
          <div
            className={`account-row ${selectedId === account.id ? "account-row--selected" : ""}`}
            key={account.id}
            onClick={() => onSelect(account)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return
              event.preventDefault()
              onSelect(account)
            }}
            role="row"
            tabIndex={0}
          >
            <span className="account-name">
              <img className="account-avatar" src={avatarFor(account)} alt="" />
              <span>
                <span className="account-name__title">
                  <strong>{account.label}</strong>
                  <button
                    type="button"
                    className={`copy-key ${copiedId === account.id ? "copy-key--done" : ""}`}
                    onClick={(event) => { event.stopPropagation(); onCopyKey(account) }}
                    aria-label={`Copy API key for ${account.label}`}
                    title="Copy API key"
                  >
                    {copiedId === account.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </span>
                <small>{account.email ?? account.emailMasked}</small>
              </span>
            </span>
            <span>{planName(account.planId)}</span>
            <QuotaCell label="5-hour" used={five?.used} cap={five?.cap} resetAt={five?.resetAt} />
            <QuotaCell label="Weekly" used={weekly?.used} cap={weekly?.cap} resetAt={weekly?.resetAt} />
            <span className="quota-cell quota-cell--monthly">
              <small className="quota-cell__label"><CircleDollarSign size={12} />Monthly</small>
              <strong className="currency-value">{account.snapshot ? <><span>$</span>{account.snapshot.monthlyRemaining.toFixed(2)}</> : "—"}</strong>
              <Progress value={monthlyRate} tone={toneFor(monthlyRate)} />
            </span>
            <span>{account.snapshot ? compact(account.snapshot.totalTokens) : "—"}</span>
            <span className={cacheRate === null ? "muted" : "positive"}>{cacheRate === null ? "Not observed" : `${Math.round(cacheRate * 100)}%`}</span>
            <span className={`status status--${account.status}`}><i />{account.status === "warning" ? "Near limit" : account.status}</span>
            <span className="row-more"><MoreHorizontal size={17} /><ChevronDown className="mobile-chevron" size={17} /></span>
          </div>
        )
      })}
    </div>
  )
}

function QuotaCell({ label, used, cap, resetAt }: { label: string; used?: number; cap?: number; resetAt?: string | null }) {
  if (used === undefined || !cap) return <span className="quota-cell muted"><small className="quota-cell__label">{label}</small><strong>—</strong></span>
  const value = used / cap
  return (
    <span className="quota-cell">
      <small className="quota-cell__label">{label}</small>
      <strong>{Math.round(value * 100)}%</strong>
      <Progress value={value} tone={toneFor(value)} />
      <small>{used.toFixed(1)} / {cap.toFixed(0)}{resetAt ? ` · ${shortReset(resetAt)}` : ""}</small>
    </span>
  )
}

function shortReset(value: string): string {
  const diff = new Date(value).getTime() - Date.now()
  if (!Number.isFinite(diff) || diff <= 0) return "resets soon"
  const hours = Math.ceil(diff / 3_600_000)
  return hours < 24 ? `${hours}h left` : `${Math.ceil(hours / 24)}d left`
}

export { compact, planName }
