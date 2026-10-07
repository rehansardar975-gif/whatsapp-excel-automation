import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookUser, CheckCircle2, MessageSquareText, Send, ShieldOff, Upload, UserCheck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { fmt, pct, timeAgo } from "@/lib/format";
import type { ActivityItem, Campaign } from "@/lib/types";
import { Button, EmptyState, ErrorState, KpiCard, PageHeader, Spinner } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import CampaignBar, { Legend } from "@/components/CampaignBar";
import ActivityRow from "@/components/ActivityRow";

interface Dash {
  contacts: number; ready: number; not_ready: number; campaigns: number; running: number; processed: number; sent: number;
  delivered: number; failed: number; skipped: number; opt_outs: number; recent_campaigns: Campaign[]; recent_activity: ActivityItem[];
}

export default function Dashboard() {
  const nav = useNavigate();
  const { data: d, error, loading, reload } = useLoad(() => api.get<Dash>("/api/dashboard"));
  if (loading && !d) return <Spinner />;
  if (error || !d) return <ErrorState message={error ?? ""} onRetry={reload} />;

  const flow = [
    { n: 1, title: "Upload contacts", desc: `${fmt(d.contacts)} contacts saved`, to: "/import", icon: Upload },
    { n: 2, title: "Clean & check", desc: `${fmt(d.ready)} ready · ${fmt(d.not_ready)} not ready`, to: "/contacts", icon: UserCheck },
    { n: 3, title: "Write message", desc: "Personalised per contact", to: "/messages", icon: MessageSquareText },
    { n: 4, title: "Send & track", desc: `${fmt(d.campaigns)} campaign${d.campaigns === 1 ? "" : "s"}`, to: "/campaigns/new", icon: Send },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Overview" title="Dashboard" subtitle="Your contacts, campaigns and results in one place."
        actions={<>
          <Button variant="secondary" icon={Upload} onClick={() => nav("/import")} data-testid="dash-upload">Upload Excel</Button>
          <Button icon={Send} onClick={() => nav("/campaigns/new")} data-testid="dash-new-campaign">New Campaign</Button>
        </>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {flow.map((s) => (
          <Link key={s.n} to={s.to} className="group card flex items-center gap-3 p-4 transition hover:border-teal-300 hover:shadow-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white group-hover:bg-teal-600"><s.icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-num text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step {s.n}</p>
              <p className="font-display text-sm font-bold text-slate-900">{s.title}</p>
              <p className="truncate text-xs text-slate-500">{s.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-600" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard testId="kpi-contacts" label="Contacts" value={fmt(d.contacts)} icon={BookUser} sub="Saved in your list" />
        <KpiCard testId="kpi-ready" label="Ready to message" value={fmt(d.ready)} icon={UserCheck} accent="teal" sub={`${pct(d.ready, d.contacts)} of contacts`} />
        <KpiCard testId="kpi-processed" label="Messages processed" value={fmt(d.processed)} icon={Send} accent="sky" sub={`Across ${fmt(d.campaigns)} campaign${d.campaigns === 1 ? "" : "s"}`} />
        <KpiCard testId="kpi-delivered" label="Delivered" value={fmt(d.delivered)} icon={CheckCircle2} accent="emerald" sub={`${pct(d.delivered, d.sent)} of sent`} />
        <KpiCard testId="kpi-failed" label="Failed" value={fmt(d.failed)} icon={XCircle} accent="rose" sub="See reasons in each campaign" />
        <KpiCard testId="kpi-optouts" label="Do Not Contact" value={fmt(d.opt_outs)} icon={ShieldOff} accent="amber" sub="Never messaged again" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Recent campaigns</h2>
            <Link to="/campaigns" className="text-sm font-semibold text-teal-700 hover:text-teal-800">View all</Link>
          </div>
          {d.recent_campaigns.length === 0 ? (
            <div className="mt-4"><EmptyState title="No campaigns yet" subtitle="Upload contacts and write a message, then start your first campaign." icon={Send}
              action={<Button icon={Send} onClick={() => nav("/campaigns/new")}>New Campaign</Button>} /></div>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {d.recent_campaigns.map((c) => (
                <li key={c.id}>
                  <Link to={`/campaigns/${c.id}`} className="block space-y-2 rounded-lg py-4 hover:bg-slate-50/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">{fmt(c.report.total)} contacts · {timeAgo(c.completed_at || c.started_at || c.created_at)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <CampaignBar r={c.report} />
                    <Legend r={c.report} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Recent activity</h2>
            <Link to="/activity" className="text-sm font-semibold text-teal-700 hover:text-teal-800">Activity log</Link>
          </div>
          <ul className="mt-1 divide-y divide-slate-100">{d.recent_activity.map((a) => <ActivityRow key={a.id} a={a} />)}</ul>
        </section>
      </div>
    </div>
  );
}
