import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import { Activity, BookUser, Database, LayoutDashboard, Menu, MessageSquareText, Plug, Send, Upload, X } from "lucide-react";
import { cn } from "./ui";
import { DemoModePill } from "./StatusBadge";

const NAV = [
  { group: "Overview", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  { group: "Contacts", items: [
    { to: "/import", label: "Upload Excel", icon: Upload },
    { to: "/contacts", label: "Contacts", icon: BookUser },
    { to: "/collect", label: "Contact Collection", icon: Database },
  ] },
  { group: "Messaging", items: [
    { to: "/messages", label: "Messages", icon: MessageSquareText },
    { to: "/campaigns", label: "Campaigns", icon: Send },
  ] },
  { group: "System", items: [
    { to: "/activity", label: "Activity Log", icon: Activity },
    { to: "/integration", label: "WhatsApp & n8n", icon: Plug },
  ] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-night text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600"><Send className="h-[18px] w-[18px] text-white" /></div>
        <div>
          <p className="font-display text-sm font-bold leading-tight text-white">SheetReach</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Excel → WhatsApp</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === "/"} onClick={() => setOpen(false)}
                  data-testid={`nav-${n.to.replace("/", "") || "dashboard"}`}
                  className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-white")}>
                  <n.icon className="h-[18px] w-[18px]" />{n.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-slate-800 p-3">
        <p className="text-[11px] font-semibold text-teal-400">Portfolio Demo</p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Sample data only. No real WhatsApp messages are sent.</p>
      </div>
    </aside>
  );
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" data-testid="mobile-menu-btn" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="hidden font-num text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400 sm:inline">P07 · Excel → WhatsApp Automation</span>
          </div>
          <div className="hidden sm:block"><DemoModePill /></div>
          <div className="sm:hidden"><DemoModePill compact /></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8"><div className="mx-auto max-w-7xl">{children}</div></main>
      </div>
    </div>
  );
}
