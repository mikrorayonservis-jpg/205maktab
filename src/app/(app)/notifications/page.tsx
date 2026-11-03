"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/Feedback";

interface N { id: number; title_az: string; message_az: string | null; type: string; link_url: string | null; is_read: number; created_at: string }

export default function NotificationsPage() {
  const [items, setItems] = useState<N[] | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const load = () => api<{ items: N[] }>(`/api/notifications?limit=100${onlyUnread ? "&unread=1" : ""}`).then((r) => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread]);
  async function markAll() {
    await api("/api/notifications/read", { body: { all: true } });
    load();
  }
  async function markOne(id: number) {
    await api("/api/notifications/read", { body: { ids: [id] } }).catch(() => undefined);
  }
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Bildirişlər"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOnlyUnread((v) => !v)} aria-pressed={onlyUnread}>{onlyUnread ? "Hamısını göstər" : "Yalnız oxunmamış"}</Button>
            <Button size="sm" onClick={markAll}><CheckCheck className="size-4" aria-hidden="true" /> Hamısını oxunmuş et</Button>
          </>
        }
      />
      {!items ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {items.map((n) => {
            const body = (
              <>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-primary")} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.is_read && "font-semibold")}>{n.title_az}{!n.is_read && <span className="sr-only"> (oxunmamış)</span>}</span>
                  {n.message_az && <span className="mt-0.5 block whitespace-pre-line text-sm text-ink-2">{n.message_az}</span>}
                  <span className="mt-1 block text-xs text-ink-3">{formatDateTime(n.created_at)}</span>
                </span>
              </>
            );
            return (
              <li key={n.id}>
                {n.link_url ? (
                  <Link href={n.link_url} onClick={() => markOne(n.id)} className="flex gap-3 p-4 hover:bg-surface-2">{body}</Link>
                ) : (
                  <button type="button" onClick={() => markOne(n.id).then(load)} className="flex w-full gap-3 p-4 text-left hover:bg-surface-2">{body}</button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Bildiriş yoxdur" icon={<Bell className="size-8" />} />
      )}
    </div>
  );
}
