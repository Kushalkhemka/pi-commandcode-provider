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
