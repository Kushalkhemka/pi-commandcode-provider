interface ProgressProps {
  value: number
  tone?: "good" | "warn" | "danger" | "cyan"
}

export function Progress({ value, tone = "good" }: ProgressProps) {
  const safe = Math.max(0, Math.min(1, value))
  return (
    <span className="progress" aria-label={`${Math.round(safe * 100)}%`}>
      <span className={`progress__fill progress__fill--${tone}`} style={{ width: `${safe * 100}%` }} />
    </span>
  )
}

export function toneFor(value: number): ProgressProps["tone"] {
  if (value >= 1) return "danger"
  if (value >= 0.8) return "warn"
  return "good"
}
