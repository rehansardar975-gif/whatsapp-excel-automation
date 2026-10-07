import { ReactNode, useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Inbox, Loader2, X } from "lucide-react";

export const cn = clsx;

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
};

export function Button({ variant = "primary", size = "md", loading, icon: Icon, className, children, ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: React.ElementType }) {
  return (
    <button {...p} disabled={p.disabled || loading}
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-5 py-3 text-sm" : "px-3.5 py-2 text-sm", VARIANTS[variant], className)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 font-num text-[11px] font-semibold uppercase tracking-[.18em] text-teal-700">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const ACCENTS = {
  slate: "text-slate-600 bg-slate-100", teal: "text-teal-700 bg-teal-50", emerald: "text-emerald-700 bg-emerald-50",
  sky: "text-sky-700 bg-sky-50", amber: "text-amber-700 bg-amber-50", rose: "text-rose-700 bg-rose-50", indigo: "text-indigo-700 bg-indigo-50",
};
export type Accent = keyof typeof ACCENTS;

export function KpiCard({ label, value, sub, icon: Icon, accent = "slate", testId }:
  { label: string; value: ReactNode; sub?: ReactNode; icon?: React.ElementType; accent?: Accent; testId?: string }) {
  return (
    <div data-testid={testId} className="card animate-slide-up p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="label">{label}</p>
        {Icon && <span className={cn("rounded-lg p-2", ACCENTS[accent])}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-2 font-num text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />{label}
    </div>
  );
}

export function EmptyState({ title, subtitle, icon: Icon = Inbox, action }: { title: string; subtitle?: string; icon?: React.ElementType; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <Icon className="h-10 w-10 text-slate-300" />
      <p className="mt-3 font-display text-sm font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
      <p className="font-semibold">We couldn't load this page.</p>
      <p className="mt-1">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={cn("relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-xl", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </label>
  );
}

export function ProgressBar({ segments, height = "h-2.5" }: { segments: { value: number; className: string; label?: string }[]; height?: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className={cn("flex w-full overflow-hidden rounded-full bg-slate-100", height)}>
      {segments.map((s, i) => s.value > 0 && (
        <div key={i} title={s.label ? `${s.label}: ${s.value}` : undefined} className={cn("h-full transition-all duration-500", s.className)} style={{ width: `${(100 * s.value) / total}%` }} />
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
      {items.map((it) => (
        <button key={it.value} onClick={() => onChange(it.value)} data-testid={`tab-${it.value}`}
          className={cn("flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition",
            value === it.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
          {it.label}
          {it.count !== undefined && <span className={cn("rounded-full px-1.5 font-num text-[11px]", value === it.value ? "bg-teal-50 text-teal-700" : "bg-slate-200 text-slate-600")}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800">
        {summary}<ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2 whitespace-nowrap">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full font-num text-xs font-bold",
            i < current ? "bg-teal-600 text-white" : i === current ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500")}>{i + 1}</span>
          <span className={cn("text-sm font-semibold", i === current ? "text-slate-900" : "text-slate-500")}>{s}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300 sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

/** WhatsApp-style message preview (generic styling, not WhatsApp branding). */
export function ChatPreview({ text, business = "Your Business" }: { text: string; business?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#EFEAE2] shadow-sm" data-testid="chat-preview">
      <div className="flex items-center gap-2.5 bg-slate-800 px-4 py-2.5 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 font-display text-xs font-bold">{business.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</div>
        <div><p className="text-sm font-semibold leading-tight">{business}</p><p className="text-[11px] text-slate-300">Business account</p></div>
      </div>
      <div className="min-h-[140px] p-4">
        <div className="max-w-[92%] whitespace-pre-wrap break-words rounded-lg rounded-tl-none bg-white px-3 py-2 text-[14px] leading-relaxed text-slate-800 shadow-sm">
          {text || <span className="text-slate-400">Your message will appear here…</span>}
          <span className="mt-1 block text-right text-[10px] text-slate-400">10:24</span>
        </div>
      </div>
    </div>
  );
}
