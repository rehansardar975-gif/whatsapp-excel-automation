import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { Button, cn, Modal, PageHeader, Spinner } from "@/components/ui";
import { DemoModePill } from "@/components/StatusBadge";

interface Status { mode: "demo" | "live"; provider: string; cloud_api_configured: boolean; api_version: string; webhook_path: string; signature_check: boolean; max_retries: number }

const FLOW = [
  ["Excel / CSV / Google Sheet", "Contacts arrive by upload, shared folder or form"],
  ["n8n workflow", "Watches for new files, calls this app's import API"],
  ["Clean & validate", "Number format, duplicates, opt-in, Do Not Contact"],
  ["Contacts database / CRM", "One clean record per phone number"],
  ["WhatsApp Business Cloud API", "Approved template, personalised per contact"],
  ["Status webhook", "Sent · delivered · failed · STOP replies"],
  ["Reporting", "Campaign results, exports, activity log"],
];

export default function Integration() {
  const { data: s, loading } = useLoad(() => api.get<Status>("/api/status"));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    try { await api.post("/api/demo/reset"); toast.success("Demo data reset"); setConfirm(false); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  if (loading || !s) return <Spinner />;
  const checks = [
    ["WhatsApp Business Account & phone number", s.cloud_api_configured],
    ["Access token stored as environment variable (never in code)", s.cloud_api_configured],
    ["Message templates approved by Meta", false],
    ["Status webhook connected to Meta", false],
    ["Webhook signature check (app secret)", s.signature_check],
  ] as const;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="System" title="WhatsApp & n8n" subtitle="How this app connects to WhatsApp and to your automation workflows." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-base font-bold">WhatsApp connection</h2><DemoModePill compact /></div>
          <p className="mt-2 text-sm text-slate-600">
            {s.mode === "demo" ? "The app is running in Demo Mode. Every step of a campaign runs for real (cleaning, queue, retries, opt-outs, reporting), but the final send is simulated. No messages leave this app." : "Live mode: messages are sent through the official WhatsApp Business Cloud API."}
          </p>
          <p className="label mt-5">To go live</p>
          <ul className="mt-2 space-y-2">
            {checks.map(([label, ok]) => (
              <li key={label} className="flex gap-2 text-sm text-slate-700">{ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}{label}</li>
            ))}
          </ul>
          <div className="mt-5 rounded-lg bg-slate-900 p-4 font-num text-xs leading-relaxed text-slate-300">
            <p className="text-slate-500"># .env (server only)</p>
            <p>WHATSAPP_MODE=cloud_api</p><p>WHATSAPP_PHONE_NUMBER_ID=…</p><p>WHATSAPP_ACCESS_TOKEN=…</p><p>WHATSAPP_APP_SECRET=…</p><p>WHATSAPP_VERIFY_TOKEN=…</p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-slate-500">Provider</dt><dd className="font-num">{s.provider}</dd></div>
            <div><dt className="text-xs text-slate-500">Graph API version</dt><dd className="font-num">{s.api_version}</dd></div>
            <div><dt className="text-xs text-slate-500">Status webhook</dt><dd className="font-num">{s.webhook_path}</dd></div>
            <div><dt className="text-xs text-slate-500">Automatic retries</dt><dd className="font-num">up to {s.max_retries}</dd></div>
          </dl>
        </div>
        <div className="card p-5">
          <h2 className="font-display text-base font-bold">Production automation flow (with n8n)</h2>
          <p className="mt-1 text-sm text-slate-500">This app exposes a simple API, so an n8n workflow can run the whole process without anyone opening the screen.</p>
          <ol className="mt-4 space-y-0">
            {FLOW.map(([t, d], i) => (
              <li key={t} className="relative flex gap-3 pb-4 last:pb-0">
                {i < FLOW.length - 1 && <span className="absolute left-[13px] top-7 h-full w-px bg-slate-200" />}
                <span className={cn("z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-num text-xs font-bold", i === 1 ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600")}>{i + 1}</span>
                <div><p className="text-sm font-semibold text-slate-800">{t}</p><p className="text-xs text-slate-500">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 font-num text-[11px] leading-relaxed text-slate-600">
            POST /api/imports → PUT /api/imports/:id → POST /api/imports/:id/commit<br />
            POST /api/campaigns → POST /api/campaigns/:id/start → GET /api/campaigns/:id
          </div>
        </div>
      </div>
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-display text-base font-bold">Reset demo data</h2><p className="text-sm text-slate-500">Restore the original sample contacts, messages and campaign. Useful before a demo recording.</p></div>
        <Button variant="danger" icon={RotateCcw} onClick={() => setConfirm(true)} data-testid="reset-demo">Reset demo</Button>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset demo data?"
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={reset} data-testid="reset-confirm">Reset everything</Button></>}>
        <p className="text-sm text-slate-600">All contacts, campaigns and activity will be replaced with the original sample data. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
