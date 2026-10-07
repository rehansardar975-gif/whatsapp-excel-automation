import { Link, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { fmt, fmtDateTime } from "@/lib/format";
import type { Campaign } from "@/lib/types";
import { Button, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import StatusBadge, { ViaBadge } from "@/components/StatusBadge";
import CampaignBar from "@/components/CampaignBar";

export default function Campaigns() {
  const nav = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api.get<Campaign[]>("/api/campaigns"));
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Step 4 · Send & track" title="Campaigns" subtitle="Every campaign keeps a full record of who was messaged and what happened."
        actions={<Button icon={Send} onClick={() => nav("/campaigns/new")} data-testid="new-campaign">New Campaign</Button>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data?.length ? (
        <EmptyState icon={Send} title="No campaigns yet" subtitle="Choose contacts and a message, review, then start." action={<Button icon={Send} onClick={() => nav("/campaigns/new")}>New Campaign</Button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="campaigns-table">
              <thead className="bg-slate-50"><tr><th className="th">Campaign</th><th className="th">Status</th><th className="th w-[28%]">Progress</th><th className="th text-right">Sent</th><th className="th text-right">Delivered</th><th className="th text-right">Failed</th><th className="th text-right">Skipped</th><th className="th">Started</th></tr></thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/60" onClick={() => nav(`/campaigns/${c.id}`)}>
                    <td className="td"><Link to={`/campaigns/${c.id}`} className="font-semibold text-slate-800 hover:text-teal-700">{c.name}</Link><p className="text-xs text-slate-400">{c.template_name} · {fmt(c.report.total)} contacts</p></td>
                    <td className="td"><div className="flex flex-wrap gap-1"><StatusBadge status={c.status} /><ViaBadge via={c.created_via} /></div></td>
                    <td className="td"><CampaignBar r={c.report} /><p className="mt-1 font-num text-xs text-slate-400">{c.report.progress}% processed</p></td>
                    <td className="td text-right font-num">{fmt(c.report.sent)}</td>
                    <td className="td text-right font-num text-emerald-700">{fmt(c.report.delivered)}</td>
                    <td className="td text-right font-num text-rose-600">{fmt(c.report.failed)}</td>
                    <td className="td text-right font-num text-amber-600">{fmt(c.report.skipped)}</td>
                    <td className="td whitespace-nowrap text-xs text-slate-500">{fmtDateTime(c.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
