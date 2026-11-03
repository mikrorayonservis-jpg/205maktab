import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { buildNav } from "@/components/app/nav";
import { Card, PageHeader, StatCard } from "@/components/ui/Feedback";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Admin paneli" };

export default async function AdminHome() {
  const u = await requirePagePermission("admin.access", "/admin");
  const one = async (sql: string) => Number((await db.queryOne<{ n: number }>(sql))?.n || 0);
  const [users, students, teachers, pending, news, events, failed] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL AND is_active = 1"),
    one("SELECT COUNT(*) AS n FROM students WHERE deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM teachers WHERE deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM news WHERE status IN ('pending','approved') AND deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM news WHERE status = 'published' AND deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM events WHERE deleted_at IS NULL AND start_datetime >= baku_now()"),
    one("SELECT COUNT(*) AS n FROM login_attempts WHERE success = 0 AND created_at >= NOW() - INTERVAL '24 hours'"),
  ]);
  const recent = can(u, "audit.view")
    ? await db.query("SELECT a.id, a.action, a.entity_type, a.created_at, u.email FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 8")
    : [];
  const admin = buildNav(u).find((g) => g.label === "İdarəetmə");
  return (
    <div className="space-y-8">
      <PageHeader title="Admin paneli" description="Məktəb platformasının idarə edilməsi" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Aktiv istifadəçi" value={users} />
        <StatCard label="Şagird / Müəllim" value={`${students} / ${teachers}`} tone="accent" />
        <StatCard label="Dərc edilmiş xəbər" value={news} hint={`${pending} məqalə növbədə`} tone="gold" />
        <StatCard label="Uğursuz giriş (24 saat)" value={failed} hint={`${events} qarşıdan gələn tədbir`} tone="danger" />
      </div>
      <section aria-labelledby="sections-h">
        <h2 id="sections-h" className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-ink-3">Bölmələr</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {admin?.items.filter((i) => i.href !== "/admin").map((i) => (
            <li key={i.href}><Link href={i.href} className="block rounded-lg border border-line bg-surface p-4 text-sm font-medium hover:border-primary/50 hover:text-primary">{i.label}</Link></li>
          ))}
          {can(u, "news.review") && <li><Link href="/editorial?scope=queue" className="block rounded-lg border border-line bg-surface p-4 text-sm font-medium hover:border-primary/50 hover:text-primary">Redaksiya növbəsi</Link></li>}
        </ul>
      </section>
      {recent.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Son əməliyyatlar</h2><Link href="/admin/audit" className="text-sm text-primary hover:underline">Audit jurnalı</Link></div>
          <ul className="divide-y divide-line text-sm">
            {recent.map((r: Record<string, any>) => <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2"><span><span className="font-mono text-xs">{r.action}</span> <span className="text-ink-3">· {r.email ?? "sistem"}</span></span><span className="text-xs text-ink-3">{formatDateTime(r.created_at)}</span></li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
