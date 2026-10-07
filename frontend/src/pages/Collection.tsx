import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Database, Download, Info, Search, UserPlus } from "lucide-react";
import { api, download } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { fmt, prettyPhone } from "@/lib/format";
import type { ImportRecord, ImportSummary } from "@/lib/types";
import { Button, EmptyState, Field, PageHeader } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";

interface Run { id: number; name: string; status: string; summary: ImportSummary; records: ImportRecord[]; steps: { label: string; count: number }[] }

export default function Collection() {
  const nav = useNavigate();
  const opts = useLoad(() => api.get<{ industries: string[]; cities: string[] }>("/api/collection/options"));
  const [industry, setIndustry] = useState("Restaurants");
  const [city, setCity] = useState("Dubai");
  const [limit, setLimit] = useState(40);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<number | null>(null);

  const collect = async () => {
    setBusy(true); setAdded(null);
    try { setRun(await api.post<Run>("/api/collection/runs", { industry, city, limit })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const add = async () => {
    if (!run) return;
    setBusy(true);
    try { const r = await api.post<ImportSummary>(`/api/collection/runs/${run.id}/add`); setAdded(r.imported ?? 0); toast.success(`${r.imported} businesses added to contacts`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Data preparation" title="Contact Collection" subtitle="Collect business listings, clean and validate the numbers, remove duplicates, then export or add them to your contacts." />
      <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p><b>Source:</b> a bundled sample business directory. No websites are scraped. In production this step connects to an approved source such as the Google Places API or the client's own CRM. Collected businesses have not opted in, so they are added as <i>Needs opt-in</i> and are never messaged automatically.</p>
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-4 sm:items-end">
        <Field label="Industry"><select className="inp" value={industry} onChange={(e) => setIndustry(e.target.value)} data-testid="col-industry">{opts.data?.industries.map((i) => <option key={i}>{i}</option>)}</select></Field>
        <Field label="City"><select className="inp" value={city} onChange={(e) => setCity(e.target.value)} data-testid="col-city">{opts.data?.cities.map((i) => <option key={i}>{i}</option>)}</select></Field>
        <Field label="How many"><select className="inp" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>{[20, 40, 80, 150].map((n) => <option key={n} value={n}>{n} listings</option>)}</select></Field>
        <Button icon={Search} loading={busy && !run} onClick={collect} data-testid="col-run">Collect & clean</Button>
      </div>

      {!run ? <EmptyState icon={Database} title="No collection yet" subtitle="Pick an industry and a city, then click Collect & clean." /> : (
        <>
          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-2" data-testid="col-steps">
              {run.steps.map((s, i) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
                    <p className="font-num text-xl font-bold text-slate-900">{fmt(s.count)}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                  </div>
                  {i < run.steps.length - 1 && <ArrowRight className="h-4 w-4 text-slate-300" />}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {fmt(run.summary.duplicate)} duplicate listings removed · {fmt(run.summary.invalid)} invalid and {fmt(run.summary.missing)} missing numbers
              {run.summary.existing ? ` · ${fmt(run.summary.existing)} already in your contacts` : ""}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" icon={Download} onClick={() => download(`/api/collection/runs/${run.id}/export?format=xlsx`)} disabled={added !== null} data-testid="col-export-xlsx">Export Excel</Button>
              <Button variant="secondary" icon={Download} onClick={() => download(`/api/collection/runs/${run.id}/export?format=csv`)} disabled={added !== null}>Export CSV</Button>
              {added === null
                ? <Button icon={UserPlus} loading={busy} onClick={add} disabled={!run.summary.will_import} data-testid="col-add">Add {fmt(run.summary.will_import)} to contacts</Button>
                : <Button icon={ArrowRight} onClick={() => nav(`/contacts?list=${run.id}`)}>View {fmt(added)} added contacts</Button>}
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="col-table">
                <thead className="bg-slate-50"><tr><th className="th">Business</th><th className="th">Contact</th><th className="th">Phone found</th><th className="th">Cleaned</th><th className="th">Website</th><th className="th">Validation</th></tr></thead>
                <tbody>
                  {run.records.map((r) => (
                    <tr key={r.row} className="border-t border-slate-100">
                      <td className="td font-semibold text-slate-800">{r.company}<p className="text-xs font-normal text-slate-400">{r.industry} · {r.city}</p></td>
                      <td className="td text-slate-600">{`${r.first_name} ${r.last_name}`.trim()}</td>
                      <td className="td font-num text-xs text-slate-500">{r.phone_raw || "—"}</td>
                      <td className="td font-num text-xs">{r.phone ? prettyPhone(r.phone) : "—"}</td>
                      <td className="td text-xs text-slate-500">{r.website?.replace("https://", "")}</td>
                      <td className="td"><StatusBadge status={r.status === "needs_opt_in" ? "ready" : r.status} />{r.status !== "needs_opt_in" && r.reason && <p className="mt-1 text-xs text-slate-500">{r.reason}</p>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
