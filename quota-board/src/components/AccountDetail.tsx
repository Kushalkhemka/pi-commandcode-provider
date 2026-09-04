import { ExternalLink, RefreshCw, Trash2, X } from "lucide-react"
import type { AccountView } from "../types"
import { compact, planName } from "./AccountTable"
import { Progress, toneFor } from "./Progress"

function percent(used: number, cap: number): number {
  return cap > 0 ? used / cap : 0
}

export function AccountDetail({
  account,
  onClose,
  onRefresh,
  onRemove,
}: {
  account: AccountView
  onClose: () => void
  onRefresh: () => void
  onRemove: () => void
}) {
  const snapshot = account.snapshot
  const cacheDenominator = snapshot
    ? snapshot.inputTokens + snapshot.cacheReadTokens
    : 0
  const cacheRate = snapshot && cacheDenominator > 0 ? snapshot.cacheReadTokens / cacheDenominator : null
  return (
    <aside className="account-detail">
      <header>
        <div><span>{account.label}</span><small className={`status status--${account.status}`}><i />{account.status}</small></div>
        <button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button>
      </header>
      <div className="detail-actions">
        <button type="button" onClick={onRefresh}><RefreshCw size={15} />Refresh</button>
        <button type="button" className="danger-link" onClick={onRemove}><Trash2 size={15} />Remove</button>
      </div>
      <dl>
        <div><dt>Plan</dt><dd>{planName(account.planId)}</dd></div>
        <div><dt>Account</dt><dd>{account.email ?? account.emailMasked}</dd></div>
        <div><dt>API key</dt><dd>{account.keyFingerprint}</dd></div>
        <div><dt>Group</dt><dd>{account.group ?? "Ungrouped"}</dd></div>
        <div><dt>Renewal</dt><dd>{account.periodEnd ? new Date(account.periodEnd).toLocaleDateString() : "—"}</dd></div>
        <div><dt>Last sync</dt><dd>{account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleTimeString() : "Never"}</dd></div>
      </dl>
      {account.error && <div className="inline-error">{account.error}</div>}
      {snapshot && (
        <>
          <section className="detail-section">
            <h3>Usage windows</h3>
            {snapshot.windows.map((window) => {
              const value = percent(window.used, window.cap)
              return (
                <div className="detail-meter" key={window.name}>
                  <span><strong>{window.label}</strong><b>{Math.round(value * 100)}%</b></span>
                  <Progress value={value} tone={toneFor(value)} />
                  <small>{window.used.toFixed(2)} / {window.cap.toFixed(2)} credits</small>
                </div>
              )
            })}
            {snapshot.monthlyCap && (
              <div className="detail-meter">
                <span><strong>Monthly</strong><b>${snapshot.monthlyRemaining.toFixed(2)} left</b></span>
                <Progress value={1 - snapshot.monthlyRemaining / snapshot.monthlyCap} tone={toneFor(1 - snapshot.monthlyRemaining / snapshot.monthlyCap)} />
              </div>
            )}
          </section>
          <section className="detail-section">
            <h3>Token breakdown</h3>
            <TokenLine label="Input" value={snapshot.inputTokens} color="cyan" />
            <TokenLine label="Output" value={snapshot.outputTokens} color="violet" />
            <TokenLine label="Cache read" value={snapshot.cacheReadTokens} color="mint" />
            <TokenLine label="Cache write" value={snapshot.cacheWriteTokens} color="amber" />
            <p className="coverage-note">Cache/model coverage {Math.round(snapshot.telemetryCoverage * 100)}%. {cacheRate === null ? "Quota API does not expose cache tokens." : `Observed hit rate ${Math.round(cacheRate * 100)}%.`}</p>
          </section>
        </>
      )}
      <a className="studio-link" href="https://commandcode.ai/usage" target="_blank" rel="noreferrer">Open CommandCode Studio <ExternalLink size={14} /></a>
    </aside>
  )
}

function TokenLine({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="token-line"><i className={`dot dot--${color}`} /><span>{label}</span><strong>{compact(value)}</strong></div>
}
