/** Daxili bildiriş sistemi. Bildirişlər yalnız konkret istifadəçi ID-lərinə yazılır. */
import "server-only";
import { db, type Db } from "@/lib/db";

export type NotificationType = "grade" | "attendance" | "homework" | "homework_due" | "news" | "event" | "editorial" | "system";

export interface NotificationInput {
  title: string;
  message?: string;
  type: NotificationType;
  link?: string;
  entityType?: string;
  entityId?: number;
}

export async function notifyUsers(userIds: number[], n: NotificationInput, tx: Db = db) {
  const unique = [...new Set(userIds.filter((x) => Number.isInteger(x) && x > 0))];
  if (!unique.length) return;
  const rows = unique.map((uid) => [uid, n.title.slice(0, 255), n.message ?? null, n.type, n.link ?? null, n.entityType ?? null, n.entityId ?? null]);
  for (let i = 0; i < rows.length; i += 500) {
    await tx.execute(
      "INSERT INTO notifications (user_id, title_az, message_az, type, link_url, entity_type, entity_id) VALUES ?",
      [rows.slice(i, i + 500)]
    );
  }
}

/** Bütün aktiv istifadəçilərə (və ya rollara görə) elan bildirişi. */
export async function notifyRoles(roleCodes: string[] | "all", n: NotificationInput) {
  const users =
    roleCodes === "all"
      ? await db.query<{ id: number }>("SELECT id FROM users WHERE is_active = 1 AND deleted_at IS NULL")
      : await db.query<{ id: number }>(
          `SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
            WHERE r.code IN (?) AND u.is_active = 1 AND u.deleted_at IS NULL`,
          [roleCodes]
        );
  await notifyUsers(users.map((u) => u.id), n);
}

/** Son tarixi yaxınlaşan ev tapşırıqları üçün xatırlatma (dərs günü ərzində bir dəfə). */
export async function ensureHomeworkDueReminders(userId: number, studentIds: number[]) {
  if (!studentIds.length) return;
  const due = await db.query<{ id: number; title: string; due_date: string }>(
    `SELECT h.id, h.title, h.due_date FROM homework h
      WHERE h.deleted_at IS NULL AND h.class_id IN (SELECT class_id FROM students WHERE id IN (?))
        AND h.due_date BETWEEN baku_today() AND baku_today() + 1
        AND NOT EXISTS (SELECT 1 FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.student_id IN (?))
        AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = ? AND n.type = 'homework_due' AND n.entity_type = 'homework' AND n.entity_id = h.id)`,
    [studentIds, studentIds, userId]
  );
  for (const h of due) {
    await notifyUsers([userId], {
      title: "Ev tapşırığının son tarixi yaxınlaşır",
      message: h.title,
      type: "homework_due",
      link: `/homework/${h.id}`,
      entityType: "homework",
      entityId: h.id,
    });
  }
}
