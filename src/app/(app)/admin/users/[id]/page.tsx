import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth/guards";
import { can, canAssignRole, ROLES, roleName, type RoleCode } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { getUserDetail } from "@/server/users";
import { Badge, Card, PageHeader } from "@/components/ui/Feedback";
import { UserEditor } from "./UserEditor";

export const metadata: Metadata = { title: "İstifadəçi" };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePagePermission("users.view", `/admin/users/${id}`);
  const data = await getUserDetail(Number(id)).catch(() => null);
  if (!data) notFound();
  const u = data.user;
  const assignable = ROLES.filter((r) => canAssignRole(actor, r.code)).map((r) => ({ code: r.code, name: r.name }));
  const editable = can(actor, "users.manage") && u.id !== actor.id && !(u.roles.includes("super_admin") && !actor.roles.includes("super_admin"));
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow="İstifadəçi" title={[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email} description={u.email} />
      <Card className="grid gap-4 p-6 sm:grid-cols-3">
        <div><p className="text-xs uppercase text-ink-3">Status</p><p className="mt-1">{u.is_active ? <Badge tone="success">Aktiv</Badge> : <Badge tone="danger">Deaktiv</Badge>} {!u.email_verified && <Badge tone="warning">E-poçt təsdiqlənməyib</Badge>}</p></div>
        <div><p className="text-xs uppercase text-ink-3">Qeydiyyat</p><p className="mt-1 text-sm">{formatDateTime(u.created_at)}</p></div>
        <div><p className="text-xs uppercase text-ink-3">Son giriş</p><p className="mt-1 text-sm">{u.last_login_at ? formatDateTime(u.last_login_at) : "—"}</p></div>
        <div className="sm:col-span-3"><p className="text-xs uppercase text-ink-3">Bağlı profillər</p>
          <ul className="mt-1 space-y-1 text-sm">
            {data.links.teacher && <li>Müəllim: {data.links.teacher.first_name} {data.links.teacher.last_name}</li>}
            {data.links.student && <li>Şagird: {data.links.student.first_name} {data.links.student.last_name} ({data.links.student.class_name ?? "sinif yoxdur"})</li>}
            {data.links.children.map((c: Record<string, any>) => <li key={c.id}>Valideyn: {c.first_name} {c.last_name} ({c.class_name ?? "—"})</li>)}
            {!data.links.teacher && !data.links.student && !data.links.children.length && <li className="text-ink-3">Yoxdur</li>}
          </ul>
        </div>
      </Card>
      {editable ? (
        <UserEditor id={u.id} isActive={Boolean(u.is_active)} roles={u.roles as RoleCode[]} assignable={assignable} allRoleNames={Object.fromEntries(ROLES.map((r) => [r.code, r.name]))} />
      ) : (
        <Card className="p-6"><p className="text-sm text-ink-3">Rollar: {u.roles.map(roleName).join(", ")}. Bu hesabı dəyişmək üçün səlahiyyətiniz yoxdur.</p></Card>
      )}
      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold">Son giriş cəhdləri</h2>
        <ul className="divide-y divide-line text-sm">
          {data.logins.map((l: Record<string, any>, i: number) => <li key={i} className="flex justify-between py-2"><span>{l.success ? <Badge tone="success">Uğurlu</Badge> : <Badge tone="danger">{l.reason}</Badge>}</span><span className="text-ink-3">{formatDateTime(l.created_at)}</span></li>)}
          {!data.logins.length && <li className="py-2 text-ink-3">Qeyd yoxdur.</li>}
        </ul>
      </Card>
    </div>
  );
}
