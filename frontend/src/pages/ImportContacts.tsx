import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Download, FileSpreadsheet, RotateCcw, Send, ShieldCheck, Upload, Users } from "lucide-react";
import { api } from "@/lib/api";
import { COUNTRY_NAMES, fmt, prettyPhone } from "@/lib/format";
import type { ImportPreview, ImportSummary } from "@/lib/types";
import { Button, cn, Details, Field, PageHeader, Steps } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";

const COUNTRIES = ["AE", "SA", "QA", "KW", "BH", "OM", "PK", "IN", "EG", "GB", "US"];

export default function ImportContacts() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState("AE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);

  const uploadFile = async (file: File) => {
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("file", file); fd.append("default_country", country);
    try {
      const p = await api.post<ImportPreview>("/api/imports", fd);
      setPreview(p); setConsent(false); setStep(1);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const useSample = async (name: string) => {
    setBusy(true);
    try {
      const blob = await (await fetch(`/api/samples/${name}`)).blob();
      await uploadFile(new File([blob], name));
    } catch { setError("Could not load the sample file."); setBusy(false); }
  };

  const update = async (body: { mapping?: Record<string, string | null>; default_country?: string; consent_confirmed?: boolean }) => {
    if (!preview) return;
    setBusy(true);
    try { setPreview(await api.put<ImportPreview>(`/api/imports/${preview.id}`, { consent_confirmed: consent, ...body })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await api.post<ImportSummary>(`/api/imports/${preview.id}/commit`, { consent_confirmed: consent });
      setResult(r); setStep(2);
      toast.success(`${fmt(r.imported)} contacts imported`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const reset = () => { setStep(0); setPreview(null); setResult(null); setError(null); };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Step 1 · Contacts" title="Upload Excel" subtitle="Upload your contact list. We clean it automatically and show you what's usable before anything is saved." />
      <div className="card px-5 py-4"><Steps steps={["Upload file", "Review & clean", "Done"]} current={step} /></div>
      {step === 0 && <UploadStep busy={busy} error={error} country={country} setCountry={setCountry} onFile={uploadFile} onSample={useSample} />}
      {step === 1 && preview && (
        <ReviewStep p={preview} busy={busy} consent={consent}
          setConsent={(v) => { setConsent(v); update({ consent_confirmed: v }); }}
          onMapping={(m) => update({ mapping: m })} onCountry={(c) => update({ default_country: c })}
          onCommit={commit} onCancel={reset} />
      )}
      {step === 2 && result && (
        <div className="card animate-slide-up p-8 text-center" data-testid="import-done">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-3 font-display text-xl font-bold text-slate-900">{fmt(result.imported)} contacts imported</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
            {fmt(result.ready)} are ready to message{result.needs_opt_in ? `, ${fmt(result.needs_opt_in)} need an opt-in first` : ""}.
            {" "}{fmt(result.duplicate + result.invalid + result.missing + result.do_not_contact + result.existing)} rows were left out (duplicates, bad numbers, Do Not Contact or already saved).
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" icon={Users} onClick={() => nav(`/contacts?list=${preview?.id}`)}>View contacts</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={reset}>Upload another file</Button>
            <Button icon={Send} onClick={() => nav(`/campaigns/new?list=${preview?.id}`)} data-testid="import-create-campaign">Create campaign for this list</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadStep({ busy, error, country, setCountry, onFile, onSample }: {
  busy: boolean; error: string | null; country: string; setCountry: (c: string) => void; onFile: (f: File) => void; onSample: (n: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          onClick={() => !busy && ref.current?.click()} data-testid="dropzone"
          className={cn("flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-6 py-14 text-center transition",
            drag ? "border-teal-500 bg-teal-50/50" : "border-slate-300 hover:border-teal-400")}>
          <span className="rounded-xl bg-teal-50 p-3 text-teal-700"><FileSpreadsheet className="h-8 w-8" /></span>
          <p className="mt-4 font-display text-lg font-bold text-slate-900">{busy ? "Reading your file…" : "Drop your Excel or CSV file here"}</p>
          <p className="mt-1 text-sm text-slate-500">or click to choose a file · .xlsx or .csv · up to 5 MB / 10,000 rows</p>
          <Button className="mt-5" icon={Upload} loading={busy} onClick={(e) => { e.stopPropagation(); ref.current?.click(); }}>Choose file</Button>
          <input ref={ref} type="file" accept=".xlsx,.xlsm,.csv,.xls" className="hidden" data-testid="file-input"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </div>
        {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-testid="upload-error">{error}</div>}
      </div>
      <div className="space-y-4">
        <div className="card p-5">
          <Field label="Country for local numbers" hint="Used for numbers written without a country code, like 050 123 4567. Numbers with +code or a Country column are read correctly anyway.">
            <select className="inp" value={country} onChange={(e) => setCountry(e.target.value)} data-testid="country-select">
              {COUNTRIES.map((c) => <option key={c} value={c}>{COUNTRY_NAMES[c]}</option>)}
            </select>
          </Field>
        </div>
        <div className="card p-5">
          <p className="label">No file at hand?</p>
          <p className="mt-1 text-sm text-slate-500">Try a sample list with typical problems: mixed number formats, duplicates and missing numbers.</p>
          <div className="mt-3 space-y-2">
            {[["sample-contacts-1250.xlsx", "1,250 contacts (Excel)"], ["sample-contacts-messy.csv", "64 messy contacts (CSV)"]].map(([f, l]) => (
              <div key={f} className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="flex-1 justify-start" icon={FileSpreadsheet} disabled={busy} onClick={() => onSample(f)} data-testid={`sample-${f}`}>Use {l}</Button>
                <a href={`/api/samples/${f}`} title="Download file" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Download className="h-4 w-4" /></a>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-900 p-5 text-sm text-slate-300">
          <p className="font-display font-bold text-white">What happens automatically</p>
          <ul className="mt-2 space-y-1.5">
            {["Finds the name, business and phone columns", "Fixes number formats (+971…, 00971…, 050…)", "Removes duplicate numbers", "Flags invalid and missing numbers", "Checks your Do Not Contact list", "Checks WhatsApp opt-in"].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const SUMMARY_TILES: { key: keyof ImportSummary; label: string; status?: string; tone: string }[] = [
  { key: "total", label: "Rows in file", tone: "text-slate-900" },
  { key: "ready", label: "Ready to message", status: "ready", tone: "text-emerald-600" },
  { key: "needs_opt_in", label: "Need opt-in", status: "needs_opt_in", tone: "text-amber-600" },
  { key: "duplicate", label: "Duplicates removed", status: "duplicate", tone: "text-indigo-600" },
  { key: "invalid", label: "Invalid numbers", status: "invalid", tone: "text-rose-600" },
  { key: "missing", label: "No number", status: "missing", tone: "text-slate-500" },
  { key: "do_not_contact", label: "Do Not Contact", status: "do_not_contact", tone: "text-rose-600" },
  { key: "existing", label: "Already saved", status: "existing", tone: "text-slate-500" },
];

function ReviewStep({ p, busy, consent, setConsent, onMapping, onCountry, onCommit, onCancel }: {
  p: ImportPreview; busy: boolean; consent: boolean; setConsent: (v: boolean) => void;
  onMapping: (m: Record<string, string | null>) => void; onCountry: (c: string) => void; onCommit: () => void; onCancel: () => void;
}) {
  const [filter, setFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const s = p.summary;
  const rows = useMemo(() => p.records.filter((r) => !filter || r.status === filter), [p.records, filter]);
  const pageRows = rows.slice((page - 1) * 50, page * 50);
  const pages = Math.max(1, Math.ceil(rows.length / 50));
  const MAIN = ["phone", "full_name", "first_name", "last_name", "company", "country", "opt_in"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <FileSpreadsheet className="h-4 w-4 text-teal-600" /><b className="text-slate-800">{p.file_name}</b>
        <span>· {p.headers.length} columns · {fmt(s.total ?? 0)} rows</span>
      </div>

      {s.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" data-testid="mapping-error">{s.error}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="import-summary">
          {SUMMARY_TILES.map((t) => (
            <button key={t.key} onClick={() => { setFilter(filter === t.status ? "" : t.status ?? ""); setPage(1); }}
              className={cn("card p-4 text-left transition hover:shadow-md", filter && filter === t.status && "ring-2 ring-teal-500")}>
              <p className="label">{t.label}</p>
              <p className={cn("mt-1 font-num text-2xl font-bold", t.tone)} data-testid={`sum-${t.key}`}>{fmt(s[t.key] as number)}</p>
            </button>
          ))}
        </div>
      )}

      {!s.error && (
        <div className="card flex flex-col gap-3 border-teal-200 bg-teal-50/40 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="import-bar">
          <p className="text-sm text-slate-700"><b className="font-num text-base text-slate-900">{fmt(s.will_import)}</b> new contacts will be saved
            {" "}(<b>{fmt(s.ready)}</b> ready to message{s.needs_opt_in ? <>, <b>{fmt(s.needs_opt_in)}</b> need opt-in</> : null}). Problem rows are left out.</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button icon={CheckCircle2} loading={busy} disabled={!s.will_import} onClick={onCommit} data-testid="import-commit">Import {fmt(s.will_import)} contacts</Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-display text-base font-bold text-slate-900">Columns we found</h3>
          <p className="text-sm text-slate-500">Detected automatically. Change one only if it looks wrong.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {p.fields.filter((f) => (MAIN.includes(f.key) || p.mapping[f.key]) && !(["first_name", "last_name"].includes(f.key) && p.mapping.full_name && !p.mapping[f.key]) && !(f.key === "full_name" && p.mapping.first_name && !p.mapping.full_name)).map((f) => (
              <Field key={f.key} label={f.label} hint={p.mapping[f.key] && p.sample[0] ? <>e.g. <span className="font-num">{String(p.sample[0][p.mapping[f.key]!] ?? "—")}</span></> : undefined}>
                <select className={cn("inp", f.key === "phone" && !p.mapping.phone && "border-amber-400")} value={p.mapping[f.key] ?? ""} disabled={busy}
                  data-testid={`map-${f.key}`} onChange={(e) => onMapping({ ...p.mapping, [f.key]: e.target.value || null })}>
                  <option value="">— Not in file —</option>
                  {p.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
            ))}
          </div>
          <div className="mt-4 max-w-xs">
            <Field label="Country for local numbers">
              <select className="inp" value={p.default_country} onChange={(e) => onCountry(e.target.value)} disabled={busy}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{COUNTRY_NAMES[c]}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="card flex flex-col p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-600" />WhatsApp opt-in</h3>
          {s.has_opt_in_column ? (
            <p className="mt-2 text-sm text-slate-600">Opt-in is read from the <b>{p.mapping.opt_in}</b> column. Contacts marked “No” go to the Do Not Contact list. Blank ones are saved as <i>Needs opt-in</i> and won't be messaged.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">Your file has no opt-in column. WhatsApp only allows business messages to people who agreed to receive them.</p>
              <label className="mt-3 flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="consent-checkbox" />
                These contacts agreed to receive WhatsApp messages from my business.
              </label>
              <p className="mt-2 text-xs text-slate-500">If you leave this unticked, contacts are saved as <i>Needs opt-in</i>.</p>
            </>
          )}
        </div>
      </div>

      {!s.error && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h3 className="font-display text-sm font-bold text-slate-900">Row by row {filter && <span className="ml-2 font-sans font-normal text-slate-500">· showing <StatusBadge status={filter} /></span>}</h3>
            {filter && <Button variant="ghost" size="sm" onClick={() => setFilter("")}>Show all rows</Button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="import-table">
              <thead className="bg-slate-50"><tr><th className="th">Row</th><th className="th">Name</th><th className="th">Business</th><th className="th">Phone in file</th><th className="th">Cleaned number</th><th className="th">Result</th></tr></thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.row} className="border-t border-slate-100">
                    <td className="td font-num text-xs text-slate-400">{r.row}</td>
                    <td className="td font-medium text-slate-800">{`${r.first_name} ${r.last_name}`.trim() || "—"}</td>
                    <td className="td text-slate-600">{r.company || "—"}</td>
                    <td className="td font-num text-xs text-slate-500">{r.phone_raw || "—"}</td>
                    <td className="td font-num text-xs text-slate-800">{r.phone ? prettyPhone(r.phone) : "—"}</td>
                    <td className="td"><StatusBadge status={r.status} />{r.reason && <p className="mt-1 text-xs text-slate-500">{r.reason}</p>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>Page {page} of {pages} · {fmt(rows.length)} rows</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
      <Details summary="Technical details">
        Numbers are stored in international E.164 format (e.g. +971501234567), the format the WhatsApp Business Cloud API expects.
        Duplicates are detected on the cleaned number, so “050 123 4567” and “+971 50 123 4567” count as the same person. Upload ID {p.id}.
      </Details>
    </div>
  );
}
