import { KeyRound, X } from "lucide-react"
import { useState, type FormEvent } from "react"
import type { AccountView } from "../types"

export function KeyCopyModal({
  account,
  onClose,
  onConfirm,
}: {
  account: AccountView
  onClose: () => void
  onConfirm: (token: string) => Promise<void>
}) {
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onConfirm(token)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not copy this API key")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="account-modal key-copy-modal" role="dialog" aria-modal="true" aria-labelledby="copy-key-title">
        <button className="icon-button account-modal__close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <span className="key-copy-modal__icon"><KeyRound size={18} /></span>
        <h2 id="copy-key-title">Copy API key</h2>
        <p>Confirm operator access for <strong>{account.label}</strong>.</p>
        <form onSubmit={submit}>
          <label>
            Key export token
            <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" autoFocus required />
          </label>
          {error && <div className="inline-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button--primary" disabled={busy || !token}>{busy ? "Copying…" : "Copy key"}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
