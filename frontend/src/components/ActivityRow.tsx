import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ActivityItem } from "@/lib/types";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { cn } from "./ui";

const ICON = {
  info: { i: Info, c: "text-sky-600 bg-sky-50" }, success: { i: CheckCircle2, c: "text-emerald-600 bg-emerald-50" },
  warning: { i: AlertTriangle, c: "text-amber-600 bg-amber-50" }, error: { i: XCircle, c: "text-rose-600 bg-rose-50" },
};

export default function ActivityRow({ a, full }: { a: ActivityItem; full?: boolean }) {
  const { i: Icon, c } = ICON[a.level] ?? ICON.info;
  return (
    <li className="flex gap-3 py-3">
      <span className={cn("mt-0.5 h-7 w-7 shrink-0 rounded-lg p-1.5", c)}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700">{a.message}</p>
        <p className="mt-0.5 text-xs text-slate-400" title={fmtDateTime(a.created_at)}>
          {full ? fmtDateTime(a.created_at) : timeAgo(a.created_at)}
          {full && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-num text-[10px] uppercase text-slate-500">{a.type.replace("_", " ")}</span>}
        </p>
      </div>
    </li>
  );
}
