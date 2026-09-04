import { Activity, AlertTriangle, CalendarClock, CheckCircle2, Coins, Database, Gauge, ShieldCheck } from "lucide-react"
import type { AccountView, DashboardData } from "../types"
import { AccountTable, compact } from "./AccountTable"
import { ModelMix, TokenFlowChart } from "./Charts"
import { Progress, toneFor } from "./Progress"

export function OverviewPage({
  data,
  selectedId,
  onSelect,
}: {
  data: DashboardData
  selectedId: string | null
  onSelect: (account: AccountView) => void
}) {
  const fiveHour = aggregateWindow(data.accounts, "fiveHour")
  const weekly = aggregateWindow(data.accounts, "weekly")
  return (
    <div className="overview-page">
      <section className="panel usage-overview">
        <header className="usage-overview__heading">
          <div><h2>Usage overview</h2><span>Across {data.totals.connected} connected account{data.totals.connected === 1 ? "" : "s"}</span></div>
          <small>5-hour resets {fiveHour.resetAt ? formatReset(fiveHour.resetAt) : "—"} · weekly {weekly.resetAt ? formatReset(weekly.resetAt) : "—"}</small>
        </header>
        <div className="usage-metrics">
          <UsageMetric icon={Coins} label="Monthly credits left" value={`$${data.totals.monthlyRemaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} detail={data.totals.monthlyCap ? `${Math.round((data.totals.monthlyRemaining / data.totals.monthlyCap) * 100)}% of $${data.totals.monthlyCap.toLocaleString()}` : "No active billing cap"} />
          <UsageMetric icon={Gauge} label="5-hour utilization" value={`${Math.round(fiveHour.value * 100)}%`} detail={`${fiveHour.used.toFixed(1)} of ${fiveHour.cap.toFixed(0)} credits`} progress={fiveHour.value} />
          <UsageMetric icon={CalendarClock} label="Weekly utilization" value={`${Math.round(weekly.value * 100)}%`} detail={`${weekly.used.toFixed(1)} of ${weekly.cap.toFixed(0)} credits`} progress={weekly.value} />
          <UsageMetric icon={Activity} label="Total tokens" value={compact(data.totals.totalTokens)} detail={`Input ${compact(data.totals.inputTokens)} · Output ${compact(data.totals.outputTokens)}`} />
        </div>
        <div className="token-band">
          <TokenFlowChart points={data.trend} totals={data.totals} />
        </div>
        <AnalyticsBand data={data} />
      </section>

      <section className="panel accounts-panel">
        <PanelHeading title="Accounts" caption={`${data.accounts.length} connected · ${data.totals.errors} failed`} />
        <AccountTable accounts={data.accounts} selectedId={selectedId} onSelect={onSelect} />
      </section>
    </div>
  )
}

export function AccountsPage({ data, selectedId, onSelect }: { data: DashboardData; selectedId: string | null; onSelect: (account: AccountView) => void }) {
  return (
    <section className="panel page-panel">
      <PanelHeading title="Accounts" caption="Quota health and billing-cycle balances" />
      <AccountTable accounts={data.accounts} selectedId={selectedId} onSelect={onSelect} />
    </section>
  )
}

export function ModelsPage({ data }: { data: DashboardData }) {
  return (
    <section className="page-grid">
      <article className="panel page-panel"><PanelHeading title="Model distribution" caption="Requires observed provider telemetry" /><ModelMix models={data.models} /></article>
      <article className="panel page-panel">
        <PanelHeading title="Telemetry coverage" caption="What the API key can and cannot return" />
        <div className="coverage-meter"><strong>{Math.round(data.totals.telemetryCoverage * 100)}%</strong><Progress value={data.totals.telemetryCoverage} tone="cyan" /><p>Quota endpoints do not expose historical model or cache fields. Ingest streamed provider usage to populate this view.</p></div>
      </article>
    </section>
  )
}

export function RequestsPage({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="metric-rail metric-rail--three">
        <Metric label="Requests" value={data.totals.totalRequests.toLocaleString()} detail="Current billing periods" />
        <Metric label="Success rate" value={data.totals.successRate === null ? "—" : `${(data.totals.successRate * 100).toFixed(1)}%`} detail="Across connected accounts" />
        <Metric label="Provider cost" value={`$${data.totals.totalCost.toFixed(2)}`} detail="Reported by CommandCode" />
      </section>
      <section className="panel page-panel request-chart"><PanelHeading title="Input and output activity" caption="Changes between board refreshes" /><TokenFlowChart points={data.trend} totals={data.totals} /></section>
    </>
  )
}

export function SettingsPage({ data }: { data: DashboardData }) {
  return (
    <div className="settings-layout">
      <section className="panel page-panel">
        <PanelHeading title="Endpoint coverage" caption="Verified against the current CommandCode client" />
        <div className="endpoint-table">
          {data.endpoints.map((endpoint) => (
            <div className="endpoint-row" key={`${endpoint.method}:${endpoint.path}`}>
              <span className={`method method--${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
              <code>{endpoint.path}</code>
              <span>{endpoint.purpose}</span>
              <small>{endpoint.stability.replace("client-observed", "client observed")}</small>
            </div>
          ))}
        </div>
      </section>
      <aside className="panel boundary-panel">
        <ShieldCheck size={24} />
        <h3>Server-side key vault</h3>
        <p>Keys are encrypted with AES-256-GCM and never returned to the browser. Files are written with owner-only permissions.</p>
        <Database size={24} />
        <h3>Honest analytics</h3>
        <p>Input/output totals are available immediately. Cache and model charts show only observed telemetry—not estimates.</p>
      </aside>
    </div>
  )
}

function Metric({ label, value, detail, progress }: { label: string; value: string; detail: string; progress?: number }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong>{progress !== undefined && <Progress value={progress} tone={toneFor(progress)} />}<small>{detail}</small></article>
}

function PanelHeading({ title, caption }: { title: string; caption: string }) {
  return <header className="panel-heading"><h2>{title}</h2><span>{caption}</span></header>
}

function aggregateWindow(accounts: AccountView[], name: "fiveHour" | "weekly") {
  const rows = accounts.flatMap((account) => account.snapshot?.windows.filter((window) => window.name === name) ?? [])
  const used = rows.reduce((sum, row) => sum + row.used, 0)
  const cap = rows.reduce((sum, row) => sum + row.cap, 0)
  const resetAt = rows.map((row) => row.resetAt).filter((value): value is string => Boolean(value)).sort()[0] ?? null
  return { used, cap, value: cap > 0 ? used / cap : 0, resetAt }
}

function formatReset(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "later"
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return "soon"
  const hours = Math.ceil(diff / 3_600_000)
  if (hours < 24) return `in ${hours}h`
  const days = Math.ceil(hours / 24)
  return `in ${days}d`
}

function AnalyticsBand({ data }: { data: DashboardData }) {
  const rows = [
    ["Requests", data.totals.totalRequests.toLocaleString()],
    ["Provider cost", `$${data.totals.totalCost.toFixed(2)}`],
    ["Success rate", data.totals.successRate === null ? "—" : `${(data.totals.successRate * 100).toFixed(1)}%`],
    ["Cache hit rate", data.totals.cacheHitRate === null ? "Not observed" : `${Math.round(data.totals.cacheHitRate * 100)}%`],
  ]
  return <div className="analytics-band">{rows.map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</div>
}

function UsageMetric({ icon: Icon, label, value, detail, progress }: { icon: typeof Activity; label: string; value: string; detail: string; progress?: number }) {
  return (
    <article className="usage-metric">
      <span className="usage-metric__icon"><Icon size={18} /></span>
      <div><small>{label}</small><strong>{value}</strong>{progress !== undefined && <Progress value={progress} tone={toneFor(progress)} />}<span>{detail}</span></div>
    </article>
  )
}

export function ConnectionBanner({ message, error }: { message: string; error?: boolean }) {
  return <div className={`connection-banner ${error ? "connection-banner--error" : ""}`}>{error ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}{message}</div>
}
