import { Menu, Moon, Plus, RefreshCw, Sun, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getDashboard, refreshAccount, refreshAll, removeAccount } from "./api"
import { AccountDetail } from "./components/AccountDetail"
import { AddAccountModal } from "./components/AddAccountModal"
import { navItems } from "./components/Icons"
import {
  AccountsPage,
  ConnectionBanner,
  ModelsPage,
  OverviewPage,
  RequestsPage,
  SettingsPage,
} from "./components/Pages"
import type { AccountView, DashboardData, RangeKey } from "./types"

type NavId = (typeof navItems)[number]["id"]
type Theme = "dark" | "light"

export function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [range, setRange] = useState<RangeKey>("24h")
  const [activeNav, setActiveNav] = useState<NavId>("overview")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem("quota-board-theme")
    if (saved === "light" || saved === "dark") return saved
    return "dark"
  })
  const [addOpen, setAddOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await getDashboard(range))
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Could not load the board", error: true })
    }
  }, [range])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("quota-board-theme", theme)
  }, [theme])

  const selected = useMemo(
    () => data?.accounts.find((account) => account.id === selectedId) ?? null,
    [data, selectedId],
  )

  async function refreshEverything() {
    setBusy(true)
    try {
      const result = await refreshAll()
      await load()
      setNotice({
        text: result.failed
          ? `Refreshed ${result.refreshed}; ${result.failed} account${result.failed === 1 ? "" : "s"} failed`
          : `Refreshed ${result.refreshed} account${result.refreshed === 1 ? "" : "s"}`,
        error: result.failed > 0,
      })
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Refresh failed", error: true })
    } finally {
      setBusy(false)
    }
  }

  async function refreshSelected() {
    if (!selected) return
    setBusy(true)
    try {
      await refreshAccount(selected.id)
      await load()
      setNotice({ text: `${selected.label} refreshed` })
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Refresh failed", error: true })
    } finally {
      setBusy(false)
    }
  }

  async function removeSelected() {
    if (!selected) return
    if (!window.confirm(`Remove ${selected.label} and its stored usage history?`)) return
    try {
      await removeAccount(selected.id)
      setSelectedId(null)
      await load()
      setNotice({ text: `${selected.label} removed` })
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Remove failed", error: true })
    }
  }

  function chooseAccount(account: AccountView) {
    setSelectedId(account.id)
  }

  return (
    <div className={`app-shell ${selected ? "app-shell--detail" : ""}`}>
      <aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}>
        <div className="sidebar-brand"><img className="brand-mark" src="/commandcode-symbol.svg" alt="CommandCode" /><span>CommandCode</span></div>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeNav === id ? "active" : ""} onClick={() => { setActiveNav(id); setMobileNav(false) }}><Icon size={18} />{label}</button>
          ))}
        </nav>
        <div className="sidebar-footer"><span>CC</span><div><strong>Operator</strong><small>Local encrypted vault</small></div></div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={22} /></button>
          <img className="mobile-brand" src="/commandcode-symbol.svg" alt="" />
          <div className="topbar__title"><h1>Quota Board</h1></div>
          <div className="topbar__actions">
            <span className="last-sync">Last updated: {data ? new Date(data.generatedAt).toLocaleTimeString() : "—"}<i /></span>
            <button type="button" className="icon-button theme-toggle" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label={`Use ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" className="mobile-add" onClick={() => setAddOpen(true)} aria-label="Add account"><Plus size={17} /></button>
            <button type="button" className="text-button" onClick={refreshEverything} disabled={busy}><RefreshCw size={16} className={busy ? "spin" : ""} />Refresh all</button>
            <button type="button" className="button button--primary" onClick={() => setAddOpen(true)}><Plus size={17} />Add account</button>
          </div>
        </header>

        <div className="range-row">
          <span>{activeNav === "overview" ? "Overview" : navItems.find((item) => item.id === activeNav)?.label}</span>
          <div className="range-control">{(["24h", "7d", "30d"] as RangeKey[]).map((item) => <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>{item}</button>)}</div>
        </div>

        <div className="content">
          {notice && <ConnectionBanner message={notice.text} error={notice.error} />}
          {!data ? <Loading /> : activeNav === "overview" ? (
            <OverviewPage data={data} selectedId={selectedId} onSelect={chooseAccount} />
          ) : activeNav === "accounts" ? (
            <AccountsPage data={data} selectedId={selectedId} onSelect={chooseAccount} />
          ) : activeNav === "models" ? (
            <ModelsPage data={data} />
          ) : activeNav === "requests" ? (
            <RequestsPage data={data} />
          ) : (
            <SettingsPage data={data} />
          )}
        </div>
      </main>

      {selected && <AccountDetail account={selected} onClose={() => setSelectedId(null)} onRefresh={refreshSelected} onRemove={removeSelected} />}

      {addOpen && <AddAccountModal onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); void load(); setNotice({ text: "Account connected" }) }} />}
    </div>
  )
}

function Loading() {
  return <div className="loading-state"><RefreshCw className="spin" size={24} /><span>Loading account telemetry…</span></div>
}
