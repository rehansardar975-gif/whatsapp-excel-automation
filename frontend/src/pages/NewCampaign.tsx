import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Info, MessageSquareText, Play, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { countryName, fmt } from "@/lib/format";
import type { Campaign, ListInfo, Reason, Template } from "@/lib/types";
import { Button, ChatPreview, cn, EmptyState, Field, PageHeader, Spinner, Steps } from "@/components/ui";
import { DemoModePill } from "@/components/StatusBadge";

interface Audience { total: number; ready: number; excluded: number; excluded_reasons: Reason[]; sample: Record<string, string> | null }

function render(body: string, c: Record<string, string> | null) {
  const fb: Record<string, string> = { first_name: "there", company: "your business", city: "your city", last_name: "" };
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k) => (c?.[k] || "").trim() || fb[k] || "");
}

export default function NewCampaign() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [listId, setListId] = useState(params.get("list") || "");
  const [country, setCountry] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(params.get("template") ? Number(params.get("template")) : null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const lists = useLoad(() => api.get<ListInfo[]>("/api/lists"));
  const templates = useLoad(() => api.get<Template[]>("/api/templates"));
  const countries = useLoad(() => api.get<{ countries: string[] }>("/api/contacts?page_size=1"));
  const [aud, setAud] = useState<Audience | null>(null);

  const audience = useMemo(() => ({ ...(listId ? { batch_id: Number(listId) } : {}), ...(country ? { country } : {}) }), [listId, country]);
  useEffect(() => { setAud(null); api.post<Audience>("/api/campaigns/audience-preview", audience).then(setAud).catch((e) => toast.error(e.message)); }, [audience]);
  useEffect(() => { if (!templateId && templates.data?.[0]) setTemplateId(templates.data[0].id); }, [templates.data, templateId]);
  const tpl = templates.data?.find((t) => t.id === templateId) ?? null;
  const listName = lists.data?.find((l) => String(l.id) === listId)?.name;
  useEffect(() => {
    if (!tpl) return;
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    setName(`${tpl.name}${listName ? ` — ${listName.replace(/\.(xlsx|csv)$/i, "")}` : ""} (${date})`.slice(0, 160));
  }, [tpl, listName]);

  const start = async () => {
    if (!tpl) return;
    setBusy(true);
    try {
      const c = await api.post<Campaign>("/api/campaigns", { name, template_id: tpl.id, audience });
      await api.post(`/api/campaigns/${c.id}/start`);
      toast.success("Campaign started");
      nav(`/campaigns/${c.id}`);
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  };

  const preview = tpl ? render(tpl.body, aud?.sample ?? null) : "";

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Step 4 · Campaign" title="New Campaign" subtitle="Choose who to message, choose the message, check everything, then start." />
      <div className="card px-5 py-4"><Steps steps={["Contacts", "Message", "Review & start"]} current={step} /></div>

      {step === 0 && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card space-y-4 p-5 lg:col-span-2">
            <h2 className="font-display text-base font-bold">Who should receive this?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact list">
                <select className="inp" value={listId} onChange={(e) => setListId(e.target.value)} data-testid="aud-list">
                  <option value="">All contacts</option>
                  {lists.data?.map((l) => <option key={l.id} value={l.id}>{l.name} ({fmt(l.contacts)})</option>)}
                </select>
              </Field>
              <Field label="Country">
                <select className="inp" value={country} onChange={(e) => setCountry(e.target.value)} data-testid="aud-country">
                  <option value="">All countries</option>
                  {countries.data?.countries.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
                </select>
              </Field>
            </div>
            <p className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />Only contacts with a valid number and a WhatsApp opt-in, who are not on the Do Not Contact list, will be messaged. Everyone else is skipped and listed in the results.</p>
          </div>
          <AudienceCard aud={aud} />
          <div className="flex justify-end lg:col-span-3">
            <Button icon={ArrowRight} disabled={!aud?.ready} onClick={() => setStep(1)} data-testid="next-1">Next: choose message</Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {templates.loading && !templates.data ? <Spinner /> : !templates.data?.length ? (
              <EmptyState icon={MessageSquareText} title="No messages yet" subtitle="Write your first message, then come back." action={<Button onClick={() => nav("/messages")}>Write a message</Button>} />
            ) : templates.data.map((t) => (
              <button key={t.id} onClick={() => setTemplateId(t.id)} data-testid={`pick-template-${t.id}`}
                className={cn("card w-full p-4 text-left transition hover:border-teal-300", templateId === t.id && "border-teal-500 ring-1 ring-teal-500")}>
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-slate-800">{t.name}</p><span className="text-[11px] uppercase tracking-wider text-slate-400">{t.category}</span></div>
                <p className="mt-1 text-sm text-slate-500">{t.body}</p>
              </button>
            ))}
            <Button variant="ghost" icon={MessageSquareText} onClick={() => nav("/messages")}>Write or edit messages</Button>
          </div>
          <div><p className="label mb-2">Example preview</p><ChatPreview text={preview} /><p className="mt-2 text-xs text-slate-500">Shown with the first ready contact in this audience.</p></div>
          <div className="flex justify-between lg:col-span-3">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(0)}>Back</Button>
            <Button icon={ArrowRight} disabled={!tpl} onClick={() => setStep(2)} data-testid="next-2">Next: review</Button>
          </div>
        </div>
      )}

      {step === 2 && tpl && aud && (
        <div className="grid gap-5 lg:grid-cols-3" data-testid="campaign-review">
          <div className="space-y-5 lg:col-span-2">
            <div className="card p-6">
              <p className="label">You are about to message</p>
              <p className="mt-1 font-num text-4xl font-bold text-slate-900" data-testid="review-ready">{fmt(aud.ready)} <span className="font-sans text-lg font-semibold text-slate-500">contacts</span></p>
              {aud.excluded > 0 && <p className="mt-1 text-sm text-slate-500">{fmt(aud.excluded)} more in this audience will be skipped: {aud.excluded_reasons.map((r) => `${r.reason} (${r.count})`).join(", ")}.</p>}
              <div className="mt-5"><Field label="Campaign name"><input className="inp" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} data-testid="campaign-name" /></Field></div>
            </div>
            <div className="card p-5">
              <h3 className="font-display text-sm font-bold text-slate-900">Processing settings</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Setting icon={Users} k="Audience" v={`${listName ?? "All contacts"}${country ? ` · ${countryName(country)}` : ""}`} />
                <Setting icon={MessageSquareText} k="Message" v={tpl.name} />
                <Setting icon={RefreshCw} k="Temporary failures" v="Retried automatically, up to 2 times" />
                <Setting icon={ShieldCheck} k="Opt-outs" v="Checked again right before each message" />
              </dl>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <div><div className="mb-1"><DemoModePill /></div>This campaign runs on the sandbox provider: sending, delivery updates, retries and failures behave exactly like a live campaign. Connect the official WhatsApp Business Cloud API to send live.</div>
            </div>
          </div>
          <div className="space-y-4">
            <div><p className="label mb-2">Message preview</p><ChatPreview text={preview} /></div>
            <Button size="lg" className="w-full" icon={Play} loading={busy} disabled={!name.trim()} onClick={start} data-testid="start-campaign">Start Campaign</Button>
            <Button variant="secondary" className="w-full" icon={ArrowLeft} onClick={() => setStep(1)}>Back</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Setting({ icon: Icon, k, v }: { icon: React.ElementType; k: string; v: string }) {
  return <div className="flex gap-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div></div>;
}

function AudienceCard({ aud }: { aud: Audience | null }) {
  if (!aud) return <div className="card p-5"><Spinner /></div>;
  return (
    <div className="card p-5" data-testid="audience-card">
      <p className="label">Ready to message</p>
      <p className="mt-1 font-num text-3xl font-bold text-emerald-600" data-testid="aud-ready">{fmt(aud.ready)}</p>
      <p className="text-sm text-slate-500">of {fmt(aud.total)} contacts in this audience</p>
      {aud.excluded_reasons.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          <li className="label">Will be skipped</li>
          {aud.excluded_reasons.map((r) => <li key={r.reason} className="flex justify-between gap-2 text-slate-600"><span>{r.reason}</span><b className="font-num text-amber-600">{fmt(r.count)}</b></li>)}
        </ul>
      )}
      {aud.ready === 0 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">No one in this audience can receive messages yet. Choose another list or record opt-ins on the Contacts page.</p>}
    </div>
  );
}
