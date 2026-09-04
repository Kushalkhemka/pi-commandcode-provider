import {
  Activity,
  BarChart3,
  Boxes,
  Gauge,
  KeyRound,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react"

export const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "accounts", label: "Accounts", icon: Users },
  { id: "models", label: "Models", icon: Boxes },
  { id: "requests", label: "Requests", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
] as const

export { BarChart3, Gauge, KeyRound, RefreshCw }
