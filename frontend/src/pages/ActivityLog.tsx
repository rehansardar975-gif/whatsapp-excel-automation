import { useState } from "react";
import { Activity } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { fmt } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";
import { Button, EmptyState, ErrorState, PageHeader, Spinner, Tabs } from "@/components/ui";
import ActivityRow from "@/components/ActivityRow";

const TYPES = [
  { value: "", label: "All" }, { value: "import", label: "Imports" }, { value: "duplicate", label: "Duplicates" },
  { value: "invalid", label: "Invalid numbers" }, { value: "campaign", label: "Campaigns" }, { value: "retry", label: "Retries" },
  { value: "failure", label: "Failures" }, { value: "opt_out", label: "Opt-outs" }, { value: "collection", label: "Collection" },
];

export default function ActivityLog() {
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => api.get<{ items: ActivityItem[]; total: number }>(`/api/activity${qs({ type, page, page_size: 30 })}`), [type, page]);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="System" title="Activity Log" subtitle="A record of every import, campaign, failure, retry and opt-out." />
      <Tabs value={type} onChange={(v) => { setType(v); setPage(1); }} items={TYPES} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data?.items.length ? (
        <EmptyState icon={Activity} title="Nothing recorded yet" subtitle="Events appear here as you import contacts and run campaigns." />
      ) : (
        <div className="card px-5">
          <ul className="divide-y divide-slate-100" data-testid="activity-list">{data.items.map((a) => <ActivityRow key={a.id} a={a} full />)}</ul>
          <div className="flex items-center justify-between border-t border-slate-100 py-3 text-sm text-slate-500">
            <span>{fmt(data.total)} events</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</Button>
              <Button variant="secondary" size="sm" disabled={page * 30 >= data.total} onClick={() => setPage(page + 1)}>Older</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
