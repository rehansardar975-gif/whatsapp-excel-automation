import type { Report } from "@/lib/types";
import { fmt } from "@/lib/format";
import { ProgressBar } from "./ui";

export function campaignSegments(r: Report) {
  return [
    { value: r.delivered, className: "bg-emerald-500", label: "Delivered" },
    { value: r.sent - r.delivered, className: "bg-teal-400", label: "Awaiting delivery" },
    { value: r.failed, className: "bg-rose-500", label: "Failed" },
    { value: r.skipped, className: "bg-amber-400", label: "Skipped" },
    { value: r.remaining, className: "bg-slate-200", label: "Waiting" },
  ];
}

export function Legend({ r }: { r: Report }) {
  const items = [
    ["bg-emerald-500", "Delivered", r.delivered], ["bg-teal-400", "Awaiting delivery", r.sent - r.delivered],
    ["bg-rose-500", "Failed", r.failed], ["bg-amber-400", "Skipped", r.skipped],
  ] as const;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {items.map(([c, l, v]) => <span key={l} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c}`} />{l} <b className="font-num text-slate-700">{fmt(v)}</b></span>)}
    </div>
  );
}

export default function CampaignBar({ r }: { r: Report }) {
  return <ProgressBar segments={campaignSegments(r)} />;
}
