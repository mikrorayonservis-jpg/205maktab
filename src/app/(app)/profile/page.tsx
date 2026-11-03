import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/guards";
import { roleName } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui/Feedback";
import { ChangePasswordForm, RedeemForm, SessionsList } from "./ProfileForms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const u = await requirePageUser("/profile");
  const children = u.parentId
    ? await db.query<{ id: number; first_name: string; last_name: string; class_name: string | null; relation_type: string | null }>(
        `SELECT s.id, s.first_name, s.last_name, c.name AS class_name, ps.relation_type FROM parent_student ps JOIN students s ON s.id = ps.student_id
           LEFT JOIN classes c ON c.id = s.class_id WHERE ps.parent_id = ? ORDER BY s.first_name`,
        [u.parentId]
      )
    : [];
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Profil" description="Hesab məlumatları və təhlükəsizlik" />
      <Card className="p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wide text-ink-3">Ad, soyad</dt><dd className="mt-0.5 font-medium">{u.fullName}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink-3">E-poçt</dt><dd className="mt-0.5 font-medium">{u.email}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-ink-3">Rollar</dt><dd className="mt-1 flex flex-wrap gap-1.5">{u.roles.map((r) => <Badge key={r} tone="primary">{roleName(r)}</Badge>)}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-ink-3">Ad və ya e-poçt dəyişikliyi üçün məktəb administrasiyasına müraciət edin.</p>
      </Card>
      {(u.parentId || u.roles.includes("parent")) && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Əlaqələndirilmiş uşaqlar</h2>
          {children.length ? (
            <ul className="mt-3 divide-y divide-line">
              {children.map((c) => <li key={c.id} className="py-2 text-sm"><span className="font-medium">{c.first_name} {c.last_name}</span> <span className="text-ink-3">· {c.class_name ?? "sinif yoxdur"} · {c.relation_type}</span></li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-ink-3">Hələ uşaq bağlanmayıb.</p>}
          <div className="mt-5 border-t border-line pt-5"><RedeemForm /></div>
        </Card>
      )}
      {!u.parentId && !u.studentId && !u.teacherId && (
        <Card className="p-6"><RedeemForm /></Card>
      )}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Parolu dəyiş</h2>
        <ChangePasswordForm />
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Aktiv sessiyalar</h2>
        <SessionsList />
      </Card>
    </div>
  );
}
