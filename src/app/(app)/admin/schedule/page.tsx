import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { activeSchoolYear } from "@/server/access";
import { bellTimes } from "@/server/schedule";
import { EmptyState, PageHeader } from "@/components/ui/Feedback";
import { ScheduleEditor } from "./ScheduleEditor";

export const metadata: Metadata = { title: "Cədvəl redaktoru" };

export default async function ScheduleEditorPage() {
  await requirePagePermission("schedule.manage", "/admin/schedule");
  const year = await activeSchoolYear();
  if (!year) return <><PageHeader title="Cədvəl redaktoru" /><EmptyState title="Aktiv tədris ili yoxdur" /></>;
  const [classes, teachers, subjects, bells] = await Promise.all([
    db.query<{ id: number; name: string; shift: number; room: string | null }>("SELECT id, name, shift, room FROM classes WHERE school_year_id = ? ORDER BY grade_level, name", [year.id]),
    db.query<{ id: number; name: string }>("SELECT id, CONCAT(last_name, ' ', first_name) AS name FROM teachers WHERE deleted_at IS NULL AND is_active = 1 ORDER BY last_name"),
    db.query<{ id: number; name: string }>("SELECT id, name_az AS name FROM subjects ORDER BY name_az"),
    bellTimes(),
  ]);
  return (
    <div>
      <PageHeader eyebrow="İdarəetmə" title="Cədvəl redaktoru" description={`${year.name} · Müəllim, sinif və kabinet üst-üstə düşmələri avtomatik yoxlanılır.`} />
      <ScheduleEditor classes={classes} teachers={teachers} subjects={subjects} bells={bells} />
    </div>
  );
}
