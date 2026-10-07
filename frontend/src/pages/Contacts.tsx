import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BookUser, Download, Search, ShieldOff, Trash2, Upload, UserCheck, X } from "lucide-react";
import { api, download, qs } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { countryName, fmt, prettyPhone, timeAgo } from "@/lib/format";
import type { Contact, ListInfo } from "@/lib/types";
import { Button, EmptyState, ErrorState, Field, Modal, PageHeader, Spinner, Tabs } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";

interface ContactPage { items: Contact[]; total: number; counts: Record<string, number>; countries: string[] }
interface Suppression { id: number; phone: string; name: string; reason: string; source: string; created_at: string }
type Tab = "" | "ready" | "needs_opt_in" | "not_messageable" | "dnc";
const SOURCE_LABEL: Record<string, string> = { manual: "Added manually", reply_stop: "Replied STOP", provider_opt_out: "Blocked marketing in WhatsApp", import: "Opted out in uploaded file" };

export default function Contacts() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState("created:desc");
  const [page, setPage] = useState(1);
  const list = params.get("list") || "";
  const [dncOpen, setDncOpen] = useState<null | { phone: string }>(null);

  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  const lists = useLoad(() => api.get<ListInfo[]>("/api/lists"));
  const [sortKey, order] = sort.split(":");
  const status = tab === "dnc" || tab === "not_messageable" ? "" : tab;
  const { data, error, loading, reload } = useLoad(
    () => api.get<ContactPage>(`/api/contacts${qs({ q: dq, status: tab === "not_messageable" ? "invalid" : status, country, batch_id: list, sort: sortKey, order, page, page_size: 25 })}`),
    [dq, tab, country, list, sort, page]);
  const dnc = useLoad(() => api.get<Suppression[]>("/api/suppressions"));
  const c = data?.counts ?? {};
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 25));

  const recordOptIn = async (ct: Contact) => {
    try { await api.post(`/api/contacts/${ct.id}/consent`, { opted_in: true, note: "Recorded manually by user" }); toast.success(`Opt-in recorded for ${ct.name}`); reload(true); }
    catch (e) { toast.error((e as Error).message); }
  };
  const removeDnc = async (s: Suppression) => {
    try { await api.del(`/api/suppressions/${s.id}`); toast.success("Removed from Do Not Contact. A new opt-in is needed before messaging."); dnc.reload(true); reload(true); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Step 2 · Review" title="Contacts" subtitle={`${fmt(total)} contacts · ${fmt(c.ready ?? 0)} ready to message`}
        actions={<>
          <Button variant="secondary" icon={Download} onClick={() => download(`/api/contacts/export${qs({ format: "xlsx", q: dq, status, country })}`)} data-testid="export-contacts">Export Excel</Button>
          <Button variant="secondary" icon={ShieldOff} onClick={() => setDncOpen({ phone: "" })}>Add to Do Not Contact</Button>
          <Button icon={Upload} onClick={() => nav("/import")}>Upload Excel</Button>
        </>} />

      <Tabs<Tab> value={tab} onChange={(v) => { setTab(v); setPage(1); }} items={[
        { value: "", label: "All", count: total },
        { value: "ready", label: "Ready", count: c.ready ?? 0 },
        { value: "needs_opt_in", label: "Needs opt-in", count: c.needs_opt_in ?? 0 },
        { value: "not_messageable", label: "Invalid number", count: (c.invalid ?? 0) },
        { value: "dnc", label: "Do Not Contact list", count: dnc.data?.length ?? 0 },
      ]} />

      {tab === "dnc" ? (
        <DncTable rows={dnc.data} loading={dnc.loading} onRemove={removeDnc} />
      ) : (
        <>
          <div className="card flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="inp pl-9" placeholder="Search name, business, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="contact-search" />
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="inp w-auto" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} data-testid="filter-country">
                <option value="">All countries</option>
                {data?.countries.map((x) => <option key={x} value={x}>{countryName(x)}</option>)}
              </select>
              <select className="inp w-auto max-w-[220px]" value={list} onChange={(e) => { setParams(e.target.value ? { list: e.target.value } : {}); setPage(1); }} data-testid="filter-list">
                <option value="">All lists</option>
                {lists.data?.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.contacts})</option>)}
              </select>
              <select className="inp w-auto" value={sort} onChange={(e) => setSort(e.target.value)} data-testid="sort">
                <option value="created:desc">Newest first</option><option value="name:asc">Name A–Z</option>
                <option value="company:asc">Business A–Z</option><option value="country:asc">Country</option><option value="activity:desc">Recent activity</option>
              </select>
              {(q || country || list) && <Button variant="ghost" icon={X} onClick={() => { setQ(""); setCountry(""); setParams({}); }}>Clear</Button>}
            </div>
          </div>

          {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data?.items.length ? (
            <EmptyState icon={BookUser} title={total ? "No contacts match" : "No contacts yet"}
              subtitle={total ? "Try a different search or filter." : "Upload an Excel or CSV file to get started."}
              action={!total ? <Button icon={Upload} onClick={() => nav("/import")}>Upload Excel</Button> : undefined} />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="contacts-table">
                  <thead className="bg-slate-50"><tr>
                    <th className="th">Name</th><th className="th">Business</th><th className="th">Phone</th><th className="th">Country</th>
                    <th className="th">Source</th><th className="th">Status</th><th className="th">Opt-in</th><th className="th">Last activity</th><th className="th" />
                  </tr></thead>
                  <tbody>
                    {data.items.map((ct) => (
                      <tr key={ct.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="td"><p className="font-semibold text-slate-800">{ct.name || "—"}</p><p className="text-xs text-slate-400">{ct.city}</p></td>
                        <td className="td text-slate-600">{ct.company || "—"}</td>
                        <td className="td whitespace-nowrap font-num text-xs text-slate-700">{prettyPhone(ct.phone)}</td>
                        <td className="td text-slate-600">{countryName(ct.country)}</td>
                        <td className="td text-xs text-slate-500">{ct.source}</td>
                        <td className="td"><StatusBadge status={ct.status} />{ct.reason && <p className="mt-1 max-w-[180px] text-xs text-slate-500">{ct.reason}</p>}</td>
                        <td className="td text-xs">{ct.opted_in ? <span className="text-emerald-700" title={ct.consent_source}>Yes</span> : <span className="text-slate-400">No</span>}</td>
                        <td className="td text-xs text-slate-500"><p className="max-w-[200px] truncate" title={ct.last_activity}>{ct.last_activity}</p><p className="text-slate-400">{timeAgo(ct.last_activity_at)}</p></td>
                        <td className="td whitespace-nowrap text-right">
                          {ct.status === "needs_opt_in" && <Button size="sm" variant="secondary" icon={UserCheck} onClick={() => recordOptIn(ct)}>Record opt-in</Button>}
                          {ct.status !== "do_not_contact" && ct.status !== "missing" && ct.status !== "invalid" &&
                            <button title="Add to Do Not Contact" aria-label="Add to Do Not Contact" className="ml-1 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => setDncOpen({ phone: ct.phone })}><ShieldOff className="h-4 w-4" /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{fmt(data.total)} contacts · page {page} of {pages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <DncModal open={!!dncOpen} initialPhone={dncOpen?.phone ?? ""} onClose={() => setDncOpen(null)} onDone={() => { setDncOpen(null); dnc.reload(true); reload(true); }} />
    </div>
  );
}

function DncTable({ rows, loading, onRemove }: { rows: Suppression[] | null; loading: boolean; onRemove: (s: Suppression) => void }) {
  if (loading && !rows) return <Spinner />;
  if (!rows?.length) return <EmptyState icon={ShieldOff} title="Do Not Contact list is empty" subtitle="People who reply STOP or ask not to be contacted are added here automatically." />;
  return (
    <div className="card overflow-hidden">
      <p className="border-b border-slate-100 bg-rose-50/50 px-4 py-3 text-sm text-rose-800">Numbers on this list are never added to a campaign, even if they appear in a future upload.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="dnc-table">
          <thead className="bg-slate-50"><tr><th className="th">Phone</th><th className="th">Name</th><th className="th">Reason</th><th className="th">How</th><th className="th">Added</th><th className="th" /></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="td font-num text-xs">{prettyPhone(s.phone)}</td><td className="td">{s.name || "—"}</td>
                <td className="td text-slate-600">{s.reason}</td><td className="td text-xs text-slate-500">{SOURCE_LABEL[s.source] ?? s.source}</td>
                <td className="td text-xs text-slate-500">{timeAgo(s.created_at)}</td>
                <td className="td text-right"><button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Remove from list" aria-label="Remove from list" onClick={() => onRemove(s)}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DncModal({ open, initialPhone, onClose, onDone }: { open: boolean; initialPhone: string; onClose: () => void; onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("Asked not to be contacted");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setPhone(initialPhone); }, [open, initialPhone]);
  const save = async () => {
    setBusy(true);
    try { await api.post("/api/suppressions", { phone, reason }); toast.success("Added to Do Not Contact"); onDone(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add to Do Not Contact"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" icon={ShieldOff} loading={busy} onClick={save} disabled={!phone.trim()} data-testid="dnc-save">Add to list</Button></>}>
      <div className="space-y-4">
        <Field label="Phone number" hint="Include the country code, e.g. +971 50 123 4567"><input className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="dnc-phone" autoFocus /></Field>
        <Field label="Reason"><input className="inp" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} /></Field>
        <p className="text-sm text-slate-500">This number will be skipped in every current and future campaign.</p>
      </div>
    </Modal>
  );
}
