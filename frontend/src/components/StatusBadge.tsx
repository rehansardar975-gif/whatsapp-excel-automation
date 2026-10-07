import { Workflow } from "lucide-react";
import { cn } from "./ui";

/** Every status the user can see, in business language. */
const STATUS: Record<string, { label: string; cls: string }> = {
  // contacts / import rows
  ready: { label: "Ready", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  needs_opt_in: { label: "Needs opt-in", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  do_not_contact: { label: "Do Not Contact", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  invalid: { label: "Invalid number", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  missing: { label: "No number", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  duplicate: { label: "Duplicate", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  existing: { label: "Already saved", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  // messages
  queued: { label: "Queued", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  retrying: { label: "Retrying", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  processing: { label: "Sending…", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  sent: { label: "Sent", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  delivered: { label: "Delivered", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  skipped: { label: "Skipped", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  // campaigns
  draft: { label: "Ready to start", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  running: { label: "Sending", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  paused: { label: "Paused", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Complete", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const statusLabel = (s: string) => STATUS[s]?.label ?? s;

export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", s.cls, className)}>
      {status === "processing" || status === "running" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" /> : null}
      {s.label}
    </span>
  );
}

export function ViaBadge({ via }: { via?: string }) {
  if (!via || via === "app") return null;
  return (
    <span title="This campaign was created and started by an automation workflow" data-testid="via-badge"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
      <Workflow className="h-3 w-3" />Started by {via}
    </span>
  );
}

export function DemoModePill({ compact }: { compact?: boolean }) {
  return (
    <span data-testid="demo-mode-pill" title="No real WhatsApp messages are sent. Results are simulated."
      className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
      <span className="h-2 w-2 rounded-full bg-teal-500" />
      {compact ? "Demo Mode" : "Demo Mode — WhatsApp Business API Ready"}
    </span>
  );
}
