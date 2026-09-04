import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DashboardData, ModelUsage, TrendPoint } from "../types"

const COLORS = ["#18b8f2", "#9569ec", "#43d59b", "#f0b83f", "#719bd7"]

function compact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

function tokenSeries(points: TrendPoint[], totals: DashboardData["totals"]) {
  if (points.length >= 2) return { data: points, cumulative: false }
  const cacheObserved = totals.cacheHitRate !== null
  return {
    cumulative: true,
    data: [
      { time: "Period start", input: 0, output: 0, cacheRead: cacheObserved ? 0 : null, cacheWrite: cacheObserved ? 0 : null },
      { time: "Current", input: totals.inputTokens, output: totals.outputTokens, cacheRead: cacheObserved ? totals.cacheReadTokens : null, cacheWrite: cacheObserved ? totals.cacheWriteTokens : null },
    ],
  }
}

function timeLabel(value: string) {
  if (value === "Period start" || value === "Current") return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(5)
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function OverviewTokenLines({ points, totals }: { points: TrendPoint[]; totals: DashboardData["totals"] }) {
  const series = tokenSeries(points, totals)
  const cacheObserved = totals.cacheHitRate !== null
  const rows = [
    { key: "input", label: "Input", value: totals.inputTokens, color: "var(--cyan)" },
    { key: "output", label: "Output", value: totals.outputTokens, color: "var(--violet)" },
    { key: "cacheRead", label: "Cache read", value: totals.cacheReadTokens, color: "var(--mint)", observed: cacheObserved },
    { key: "cacheWrite", label: "Cache write", value: totals.cacheWriteTokens, color: "var(--amber)", observed: cacheObserved },
  ]
  return (
    <div className="overview-token-lines" role="img" aria-label="Line chart of input, output, cache read, and cache write tokens">
      <div className="overview-token-lines__legend">
        {rows.map((row) => (
          <span key={row.key}><i style={{ background: row.color }} /><small>{row.label}</small><strong>{row.observed === false ? "—" : compact(row.value)}</strong></span>
        ))}
      </div>
      <div className="overview-token-lines__plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="time" tickFormatter={timeLabel} stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={9} minTickGap={28} />
            <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={9} tickFormatter={compact} width={52} />
            <Tooltip formatter={(value) => compact(Number(value))} labelFormatter={(value) => timeLabel(String(value))} contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: 7, color: "var(--ink)" }} />
            <Line type="monotone" dataKey="input" name="Input" stroke="var(--cyan)" strokeWidth={2} dot={series.cumulative ? { r: 2 } : false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="output" name="Output" stroke="var(--violet)" strokeWidth={2} dot={series.cumulative ? { r: 2 } : false} activeDot={{ r: 3 }} />
            {cacheObserved && <Line type="monotone" dataKey="cacheRead" name="Cache read" stroke="var(--mint)" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />}
            {cacheObserved && <Line type="monotone" dataKey="cacheWrite" name="Cache write" stroke="var(--amber)" strokeWidth={1.5} dot={false} strokeDasharray="3 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p>{series.cumulative ? "Billing-period endpoints · observed history appears after additional refreshes" : "Observed changes between board refreshes"}</p>
    </div>
  )
}

export function TokenFlowChart({ points, totals }: { points: TrendPoint[]; totals?: DashboardData["totals"] }) {
  if (points.length < 2) {
    const input = totals?.inputTokens ?? 0
    const output = totals?.outputTokens ?? 0
    const cacheRead = totals?.cacheReadTokens ?? 0
    const cacheWrite = totals?.cacheWriteTokens ?? 0
    const total = input + output + cacheRead + cacheWrite
    const cacheObserved = totals ? totals.cacheHitRate !== null : false
    const rows = [
      { label: "Input", value: input, color: "var(--cyan)", observed: true },
      { label: "Output", value: output, color: "var(--violet)", observed: true },
      { label: "Cache read", value: cacheRead, color: "var(--mint)", observed: cacheObserved },
      { label: "Cache write", value: cacheWrite, color: "var(--amber)", observed: cacheObserved },
    ]
    return (
      <div className="token-composition">
        <div className="token-composition__bar" aria-label="Current token composition">
          {rows.filter((row) => row.value > 0).map((row) => (
            <span key={row.label} style={{ width: `${total ? (row.value / total) * 100 : 0}%`, background: row.color }} />
          ))}
        </div>
        <div className="token-composition__rows">
          {rows.map((row) => (
            <div key={row.label}>
              <span><i style={{ background: row.color }} />{row.label}</span>
              <strong>{row.observed ? compact(row.value) : "—"}</strong>
              <small>{row.observed && total ? `${((row.value / total) * 100).toFixed(row.value > 0 && row.value / total < 0.01 ? 1 : 0)}%` : "—"}</small>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#1c2c38" strokeDasharray="2 3" vertical={false} />
        <XAxis dataKey="time" stroke="#748592" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis stroke="#748592" tickLine={false} axisLine={false} fontSize={11} tickFormatter={compact} />
        <Tooltip
          contentStyle={{ background: "#0d1822", border: "1px solid #2a3b47", borderRadius: 8 }}
          labelStyle={{ color: "#f5f8fb" }}
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#9aabb7" }} />
        <Line type="monotone" dataKey="input" stroke="#18b8f2" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="output" stroke="#9569ec" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cacheRead" name="Cache read" stroke="#43d59b" strokeWidth={2} dot={false} strokeDasharray="5 4" />
        <Line type="monotone" dataKey="cacheWrite" name="Cache write" stroke="#f0b83f" strokeWidth={2} dot={false} strokeDasharray="3 4" />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ModelMix({ models }: { models: ModelUsage[] }) {
  const rows = models.slice(0, 5)
  const total = rows.reduce(
    (sum, model) => sum + model.inputTokens + model.outputTokens + model.cacheReadTokens,
    0,
  )
  if (rows.length === 0) {
    return (
      <div className="chart-empty chart-empty--compact">
        <strong>Model telemetry is not exposed by quota endpoints</strong>
        <span>Send provider usage events to the board ingestion endpoint to unlock this view.</span>
      </div>
    )
  }
  const data = rows.map((model) => ({
    name: model.model,
    value: model.inputTokens + model.outputTokens + model.cacheReadTokens,
  }))
  return (
    <div className="model-mix">
      <div className="model-mix__chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="90%" stroke="none">
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span><strong>{compact(total)}</strong>observed</span>
      </div>
      <div className="model-mix__rows">
        {data.map((row, index) => (
          <div className="model-row" key={row.name}>
            <i style={{ background: COLORS[index % COLORS.length] }} />
            <span>{row.name}</span>
            <strong>{total > 0 ? `${Math.round((row.value / total) * 100)}%` : "0%"}</strong>
            <small>{compact(row.value)}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
