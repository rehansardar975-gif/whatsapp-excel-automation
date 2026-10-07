import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Download, Pause, Play, Search, Send, ShieldOff, SkipForward, XCircle } from "lucide-react";
import { api, download, qs } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { fmt, fmtDateTime, pct, prettyPhone } from "@/lib/format";
import type { Campaign, Message, Reason } from "@/lib/types";
import { Button, Details, ErrorState, KpiCard, PageHeader, Spinner, Tabs } from "@/components/ui";
import StatusBadge, { DemoModePill, ViaBadge } from "@/components/StatusBadge";
import CampaignBar, { Legend } from "@/components/CampaignBar";

type F = "" | "sent" | "delivered" | "failed" | "skipped" | "queued" | "opted_out";

export default function CampaignDetail() {
  const { id } = useParams();
  const { data: c, error, loading, reload } = useLoad(() => api.get<Campaign>(`/api/campaigns/${id}`), [id]);
  const [filter, setFilter] = useState<F>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const msgs = useLoad(() => api.get<{ items: Message[]; total: number }>(`/api/campaigns/${id}/messages${qs({ status: filter, q, page, page_size: 20 })}`), [id, filter, q, page]);
  const running = c?.status === "running";

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => { reload(true); msgs.reload(true); }, 800);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (what: "start" | "pause") => {
    try { await api.post(`/api/campaigns/${id}/${what}`); toast.success(what === "pause" ? "Campaign paused" : "Campaign running"); reload(true); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (loading && !c) return <Spinner />;
  if (error || !c) return <ErrorState message={error ?? "Not found"} onRetry={reload} />;
  const r = c.report;
  const done = c.status === "completed";
  const queueSize = r.total - r.skipped;
  const handled = r.sent + r.failed;

  return (
    <div className="space-y-5">
      <Link to="/campaigns" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Campaigns</Link>
      <PageHeader title={c.name} subtitle={<>Message: {c.template_name} · created {fmtDateTime(c.created_at)}</>}
        actions={<>
          {c.status === "draft" && <Button icon={Play} onClick={() => act("start")} data-testid="start-btn">Start Campaign</Button>}
          {running && <Button variant="secondary" icon={Pause} onClick={() => act("pause")} data-testid="pause-btn">Pause</Button>}
          {c.status === "paused" && <Button icon={Play} onClick={() => act("start")} data-testid="resume-btn">Resume</Button>}
          <Button variant="secondary" icon={Download} onClick={() => download(`/api/campaigns/${c.id}/export?format=xlsx`)} data-testid="export-results">Export results</Button>
        </>} />

      <div className="card p-6" data-testid="progress-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {done ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <Send className={running ? "h-8 w-8 animate-pulse text-sky-500" : "h-8 w-8 text-slate-400"} />}
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900" data-testid="progress-title">
                {done ? "Campaign complete" : running ? `Sending… ${fmt(handled)} of ${fmt(queueSize)}` : c.status === "paused" ? `Paused at ${fmt(handled)} of ${fmt(queueSize)}` : `${fmt(queueSize)} messages ready to send`}
              </h2>
              <p className="text-sm text-slate-500">{done ? `Finished ${fmtDateTime(c.completed_at)}` : `${r.progress}% processed`}{r.retried > 0 && ` · ${fmt(r.retried)} retried automatically`}</p>
            </div>
          </div>
          <div className="flex gap-2"><ViaBadge via={c.created_via} /><StatusBadge status={c.status} /></div>
        </div>
        <div className="mt-5"><CampaignBar r={r} /></div>
        <div className="mt-2"><Legend r={r} /></div>
        <div className="mt-4"><DemoModePill /> <span className="ml-2 text-xs text-slate-500">Sandbox run · connect the WhatsApp Cloud API to send live.</span></div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6" data-testid="result-kpis">
        <KpiCard label="Processed" value={fmt(r.processed)} sub={`of ${fmt(r.total)} · incl. ${fmt(r.skipped)} skipped`} icon={Send} testId="kpi-processed" />
        <KpiCard label="Sent" value={fmt(r.sent)} sub="Accepted by WhatsApp" icon={Send} accent="teal" testId="kpi-sent" />
        <KpiCard label="Delivered" value={fmt(r.delivered)} sub={`${pct(r.delivered, r.sent)} of sent`} icon={CheckCircle2} accent="emerald" testId="kpi-delivered" />
        <KpiCard label="Failed" value={fmt(r.failed)} sub="Reasons below" icon={XCircle} accent="rose" testId="kpi-failed" />
        <KpiCard label="Skipped" value={fmt(r.skipped)} sub="Not messaged" icon={SkipForward} accent="amber" testId="kpi-skipped" />
        <KpiCard label="Opted out" value={fmt(r.opted_out)} sub="Now on Do Not Contact" icon={ShieldOff} accent="indigo" testId="kpi-optout" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ReasonCard title="Why messages failed" empty="No failures" reasons={r.failed_reasons} tone="text-rose-600" />
        <ReasonCard title="Why contacts were skipped" empty="No one was skipped" reasons={r.skipped_reasons} tone="text-amber-600" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs<F> value={filter} onChange={(v) => { setFilter(v); setPage(1); }} items={[
            { value: "", label: "All", count: r.total }, { value: "sent", label: "Sent", count: r.sent }, { value: "delivered", label: "Delivered", count: r.delivered },
            { value: "failed", label: "Failed", count: r.failed }, { value: "skipped", label: "Skipped", count: r.skipped },
            { value: "opted_out", label: "Opted out", count: r.opted_out }, ...(r.queued ? [{ value: "queued" as F, label: "Waiting", count: r.queued }] : []),
          ]} />
          <div className="relative lg:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="inp pl-9" placeholder="Search contact or number" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="queue-table">
            <thead className="bg-slate-50"><tr><th className="th">Contact</th><th className="th w-[38%]">Message</th><th className="th">Status</th><th className="th text-center">Retries</th><th className="th">Updated</th></tr></thead>
            <tbody>
              {msgs.data?.items.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="td"><p className="font-semibold text-slate-800">{m.contact_name || "—"}</p><p className="font-num text-xs text-slate-400">{prettyPhone(m.phone)}</p></td>
                  <td className="td"><p className="line-clamp-2 text-xs text-slate-500" title={m.body}>{m.body}</p></td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1"><StatusBadge status={m.status === "queued" && m.retry_count > 0 ? "retrying" : m.status} />{m.opted_out && <StatusBadge status="do_not_contact" />}</div>
                    {m.reason && <p className="mt-1 max-w-[260px] text-xs text-slate-500">{m.reason}</p>}
                    {(m.error_code || m.provider_message_id) && <p className="mt-0.5 font-num text-[10px] text-slate-400" title="Technical detail">{m.error_code ? `code ${m.error_code}` : ""}{m.error_code && m.provider_message_id ? " · " : ""}{m.provider_message_id ? `id ${m.provider_message_id.slice(0, 14)}…` : ""}</p>}
                  </td>
                  <td className="td text-center font-num text-xs">{m.retry_count || "—"}</td>
                  <td className="td whitespace-nowrap text-xs text-slate-500">{fmtDateTime(m.updated_at)}</td>
                </tr>
              ))}
              {msgs.data && !msgs.data.items.length && <tr><td colSpan={5} className="td py-10 text-center text-slate-400">No messages in this view.</td></tr>}
            </tbody>
          </table>
        </div>
        {msgs.data && msgs.data.total > 20 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>{fmt(msgs.data.total)} messages · page {page} of {Math.ceil(msgs.data.total / 20)}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page * 20 >= msgs.data.total} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
      <Details summary="Technical details">
        Provider: <b>{c.provider === "demo" ? "Sandbox provider" : "WhatsApp Cloud API"}</b>. Error codes follow the WhatsApp Cloud API (e.g. 131026 not on WhatsApp,
        131049 per-user marketing limit — retried with backoff, 131050 user stopped marketing messages — added to Do Not Contact). Delivery updates use the same handler as the live status webhook.
      </Details>
    </div>
  );
}

function ReasonCard({ title, empty, reasons, tone }: { title: string; empty: string; reasons: Reason[]; tone: string }) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-sm font-bold text-slate-900">{title}</h3>
      {reasons.length === 0 ? <p className="mt-2 text-sm text-slate-400">{empty}</p> : (
        <ul className="mt-3 space-y-2">{reasons.map((x) => <li key={x.reason} className="flex justify-between gap-3 text-sm text-slate-600"><span>{x.reason}</span><b className={`font-num ${tone}`}>{fmt(x.count)}</b></li>)}</ul>
      )}
    </div>
  );
}
