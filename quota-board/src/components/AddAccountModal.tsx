import { CheckCircle2, Eye, EyeOff, X } from "lucide-react"
import { useState } from "react"
import { addAccount, type AccountInput, verifyAccount } from "../api"
import type { UsageSnapshot } from "../types"
import { Progress, toneFor } from "./Progress"
import { planName } from "./AccountTable"

interface Verification {
  email: string | null
  emailMasked: string
  login: string
  planId: string | null
  snapshot: UsageSnapshot | null
}

export function AddAccountModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [group, setGroup] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [refresh, setRefresh] = useState(true)
  const [verification, setVerification] = useState<Verification | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const input: AccountInput = { label, apiKey, group: group || null, refresh }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      if (!verification) {
        const result = await verifyAccount(input)
        setVerification({ ...result, snapshot: result.snapshot })
        if (!label.trim()) setLabel(result.login)
      } else {
        await addAccount(input)
        onAdded()
      }
    } catch (caught) {
      setVerification(null)
      setError(caught instanceof Error ? caught.message : "Could not verify this key")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="add-account-title">
        <button className="icon-button account-modal__close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2 id="add-account-title">Add CommandCode account</h2>
        <p>Keys are encrypted before they are stored.</p>

        <label>Account label <span>(optional; defaults to the CommandCode login)</span><input value={label} onChange={(event) => { setLabel(event.target.value); setVerification(null) }} placeholder="e.g. Research 04" autoFocus /></label>
        <label>CommandCode API key
          <span className="secret-input">
            <input type={showKey ? "text" : "password"} value={apiKey} onChange={(event) => { setApiKey(event.target.value); setVerification(null) }} placeholder="Paste API key" autoComplete="off" spellCheck={false} />
            <button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "Hide API key" : "Show API key"}>{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </span>
        </label>
        <label>Group <span>(optional)</span><input value={group} onChange={(event) => setGroup(event.target.value)} placeholder="Production, Research, Batch…" /></label>
        <label className="checkbox-row"><input type="checkbox" checked={refresh} onChange={(event) => setRefresh(event.target.checked)} />Refresh immediately after saving</label>

        {error && <div className="inline-error">{error}</div>}
        {verification && (
          <VerificationCard verification={verification} />
        )}

        <div className="modal-actions">
          <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="button button--primary" onClick={submit} disabled={busy || !apiKey.trim()}>
            {busy ? "Checking…" : verification ? "Add account" : "Verify key"}
          </button>
        </div>
      </section>
    </div>
  )
}

function VerificationCard({ verification }: { verification: Verification }) {
  const five = verification.snapshot?.windows.find((window) => window.name === "fiveHour")
  const weekly = verification.snapshot?.windows.find((window) => window.name === "weekly")
  return (
    <div className="verification-card">
      <header><CheckCircle2 size={17} />Verification successful</header>
      <div>
        <span><small>Account</small><strong>{verification.email ?? verification.emailMasked}</strong></span>
        <span><small>Plan</small><strong>{planName(verification.planId)}</strong></span>
        <VerifyMeter label="5-hour" used={five?.used} cap={five?.cap} />
        <VerifyMeter label="Weekly" used={weekly?.used} cap={weekly?.cap} />
        <span><small>Monthly left</small><strong>${verification.snapshot?.monthlyRemaining.toFixed(2) ?? "—"}</strong></span>
      </div>
    </div>
  )
}

function VerifyMeter({ label, used, cap }: { label: string; used?: number; cap?: number }) {
  const value = used !== undefined && cap ? used / cap : 0
  return <span><small>{label}</small><strong>{cap ? `${Math.round(value * 100)}%` : "—"}</strong><Progress value={value} tone={toneFor(value)} /></span>
}
