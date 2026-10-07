import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MessageSquareText, Plus, Save, Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { timeAgo } from "@/lib/format";
import type { Template } from "@/lib/types";
import { Button, ChatPreview, cn, Details, EmptyState, ErrorState, Field, PageHeader, Spinner } from "@/components/ui";

const FIELDS = [
  { key: "first_name", label: "First name", example: "Sara", fallback: "there" },
  { key: "company", label: "Business", example: "Palm Grill Kitchen", fallback: "your business" },
  { key: "city", label: "City", example: "Dubai", fallback: "your city" },
];
const EMPTY = { name: "", category: "marketing" as const, body: "" };

export default function Messages() {
  const nav = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api.get<Template[]>("/api/templates"));
  const [sel, setSel] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<{ name: string; category: "marketing" | "utility"; body: string }>(EMPTY);
  const [sample, setSample] = useState({ first_name: "Sara", company: "Palm Grill Kitchen", city: "Dubai" });
  const [preview, setPreview] = useState({ text: "", errors: [] as string[] });
  const [saving, setSaving] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (data && sel === null) {
      if (data[0]) pick(data[0]); else setSel("new");
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      api.post<{ text: string; errors: string[] }>("/api/templates/preview", { body: form.body, contact: sample })
        .then(setPreview).catch(() => undefined);
    }, 150);
    return () => clearTimeout(t);
  }, [form.body, sample]);

  const pick = (t: Template) => { setSel(t.id); setForm({ name: t.name, category: t.category, body: t.body }); };
  const insert = (key: string) => {
    const el = ta.current; const token = `{{${key}}}`;
    if (!el) return setForm((f) => ({ ...f, body: f.body + token }));
    const s = el.selectionStart, e = el.selectionEnd;
    const body = form.body.slice(0, s) + token + form.body.slice(e);
    setForm((f) => ({ ...f, body }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  };
  const save = async () => {
    setSaving(true);
    try {
      const t = sel === "new" || sel === null ? await api.post<Template>("/api/templates", form) : await api.put<Template>(`/api/templates/${sel}`, form);
      toast.success("Message saved"); setSel(t.id); reload(true);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (typeof sel !== "number" || !confirm("Delete this message? Campaigns that already used it keep their copy.")) return;
    try { await api.del(`/api/templates/${sel}`); toast.success("Message deleted"); setSel(null); setForm(EMPTY); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const len = form.body.length;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Step 3 · Message" title="Messages" subtitle="Write a message once. Each contact receives it with their own name and business."
        actions={<Button variant="secondary" icon={Plus} onClick={() => { setSel("new"); setForm(EMPTY); }} data-testid="new-message">New message</Button>} />
      <div className="grid gap-5 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          {!data?.length ? <EmptyState icon={MessageSquareText} title="No messages yet" /> : (
            <ul className="space-y-2" data-testid="template-list">
              {data.map((t) => (
                <li key={t.id}>
                  <button onClick={() => pick(t)} className={cn("card w-full p-3 text-left transition hover:border-teal-300", sel === t.id && "border-teal-500 ring-1 ring-teal-500")}>
                    <p className="truncate text-sm font-semibold text-slate-800">{t.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.body}</p>
                    <p className="mt-1.5 text-[11px] uppercase tracking-wider text-slate-400">{t.category} · {timeAgo(t.updated_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="card space-y-4 p-5 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-slate-900">{sel === "new" ? "New message" : "Message template"}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="Name (only you see this)"><input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Eid offer for retail customers" data-testid="tpl-name" maxLength={120} /></Field></div>
            <Field label="Type">
              <select className="inp" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as "marketing" | "utility" })}>
                <option value="marketing">Marketing</option><option value="utility">Service / follow-up</option>
              </select>
            </Field>
          </div>
          <div>
            <div className="flex items-end justify-between"><span className="label">Message</span><span className={cn("font-num text-xs", len > 1024 ? "text-rose-600" : "text-slate-400")}>{len} / 1024</span></div>
            <textarea ref={ta} className="inp mt-1.5 min-h-[180px] leading-relaxed" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Hi {{first_name}}, …" data-testid="tpl-body" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Insert:</span>
              {FIELDS.map((f) => (
                <button key={f.key} onClick={() => insert(f.key)} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 font-num text-xs font-semibold text-teal-800 hover:bg-teal-100" data-testid={`insert-${f.key}`}>{`{{${f.key}}}`}</button>
              ))}
            </div>
          </div>
          {preview.errors.length > 0 && form.body && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="tpl-errors">{preview.errors.join(" ")}</div>}
          {form.category === "marketing" && !/stop/i.test(form.body) && form.body.length > 20 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Tip: end marketing messages with “Reply STOP to opt out”. Replies of STOP are added to Do Not Contact automatically.</p>
          )}
          <div className="flex flex-wrap justify-between gap-2 pt-1">
            {typeof sel === "number" ? <Button variant="danger" icon={Trash2} onClick={remove}>Delete</Button> : <span />}
            <div className="flex gap-2">
              <Button variant="secondary" icon={Save} loading={saving} onClick={save} disabled={!form.name.trim() || !form.body.trim() || preview.errors.length > 0} data-testid="tpl-save">Save message</Button>
              {typeof sel === "number" && <Button icon={Send} onClick={() => nav(`/campaigns/new?template=${sel}`)}>Use in campaign</Button>}
            </div>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-4">
          <div>
            <p className="label mb-2">Example preview</p>
            <ChatPreview text={preview.text} />
          </div>
          <div className="card p-4">
            <p className="label">Preview as</p>
            <div className="mt-2 grid gap-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-slate-500">{f.label}</span>
                  <input className="inp py-1.5" value={sample[f.key as keyof typeof sample]} onChange={(e) => setSample({ ...sample, [f.key]: e.target.value })} placeholder={`empty → “${f.fallback}”`} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Clear a field to see what a contact with missing data receives.</p>
          </div>
          <Details summary="Technical details">
            In live mode this message is registered as a WhatsApp message template and sent through the official Cloud API. Fields such as
            <span className="font-num"> {"{{first_name}}"} </span> become named template parameters. Meta must approve the template before it can be sent.
          </Details>
        </section>
      </div>
    </div>
  );
}
