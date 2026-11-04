import { can, type Permission } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { canUseOfficialJournal } from "@/lib/auth/official-access";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Rol və icazələrə görə menyu (yalnız rahatlıq üçün — təhlükəsizlik serverdə yoxlanılır). */
export function buildNav(u: CurrentUser): NavGroup[] {
  const isTeacher = Boolean(u.teacherId);
  const isFamily = Boolean(u.studentId || u.parentId);
  const p = (perm: Permission) => can(u, perm);
  const groups: NavGroup[] = [
    {
      label: "Ümumi",
      items: [
        { href: "/dashboard", label: "İdarə paneli", icon: "home" },
        { href: "/notifications", label: "Bildirişlər", icon: "bell" },
        { href: "/profile", label: "Profil", icon: "user" },
      ],
    },
  ];
  const journal: NavItem[] = [];
  if (canUseOfficialJournal(u)) journal.push({ href: "/official-journal", label: "Rəsmi Elektron Jurnal", icon: "external" });
  if (isTeacher || p("grades.manage_all")) journal.push({ href: "/journal", label: "Məktəbdaxili jurnal", icon: "book" });
  if (isFamily || p("grades.view_all") || isTeacher) journal.push({ href: "/grades", label: "Qiymətlər", icon: "star" });
  if (isFamily || isTeacher || p("attendance.view_all")) journal.push({ href: "/attendance", label: "Davamiyyət", icon: "check" });
  if (isFamily || isTeacher || p("schedule.view_all")) journal.push({ href: "/schedule", label: "Dərs cədvəli", icon: "calendar" });
  if (isFamily || isTeacher || p("homework.view_all")) journal.push({ href: "/homework", label: "Ev tapşırıqları", icon: "clipboard" });
  if (p("reports.view")) journal.push({ href: "/reports", label: "Hesabatlar", icon: "chart" });
  if (journal.length) groups.push({ label: "Elektron jurnal", items: journal });
  if (p("news.submit") || p("news.review") || p("news.publish")) {
    groups.push({ label: "Redaksiya", items: [{ href: "/editorial", label: "Məqalələr", icon: "news" }] });
  }
  if (p("admin.access")) {
    const admin: NavItem[] = [{ href: "/admin", label: "Admin paneli", icon: "shield" }];
    if (p("users.view")) admin.push({ href: "/admin/users", label: "İstifadəçilər", icon: "users" });
    if (p("invitations.manage")) admin.push({ href: "/admin/invitations", label: "Dəvət kodları", icon: "key" });
    if (p("students.manage")) admin.push({ href: "/admin/r/students", label: "Şagirdlər", icon: "graduation" });
    if (p("parents.link")) admin.push({ href: "/admin/parents", label: "Valideyn əlaqələri", icon: "link" });
    if (p("teachers.manage")) admin.push({ href: "/admin/r/teachers", label: "Müəllimlər", icon: "briefcase" });
    // Sinif idarəsi (dəvət kodları, yerləşdirmə, import) köhnə cədvəl redaktorunu əvəz edir; /admin/r/classes ünvanı işləməyə davam edir
    const classesPage = p("classes.manage") || p("students.enroll");
    if (classesPage) admin.push({ href: "/admin/classes", label: "Siniflər və kodlar", icon: "layers" });
    if (p("school.manage")) {
      if (!classesPage) admin.push({ href: "/admin/r/classes", label: "Siniflər", icon: "layers" });
      admin.push({ href: "/admin/r/subjects", label: "Fənlər", icon: "book" });
      admin.push({ href: "/admin/r/assignments", label: "Fənn təyinatları", icon: "link" });
      admin.push({ href: "/admin/r/school-years", label: "Tədris illəri", icon: "calendar" });
    }
    if (p("schedule.manage")) {
      admin.push({ href: "/admin/schedule", label: "Cədvəl redaktoru", icon: "calendar" });
      admin.push({ href: "/admin/r/bell-times", label: "Zəng cədvəli", icon: "clock" });
    }
    if (p("news.manage_categories")) admin.push({ href: "/admin/r/news-categories", label: "Xəbər kateqoriyaları", icon: "tag" });
    if (p("events.manage")) admin.push({ href: "/admin/r/events", label: "Tədbirlər", icon: "calendar" });
    if (p("gallery.manage")) admin.push({ href: "/admin/r/galleries", label: "Qalereya", icon: "image" });
    if (p("documents.manage")) admin.push({ href: "/admin/r/documents", label: "Sənədlər", icon: "file" });
    if (p("content.manage")) {
      admin.push({ href: "/admin/pages", label: "Səhifələr", icon: "file" });
      admin.push({ href: "/admin/r/leadership", label: "Rəhbərlik", icon: "users" });
      admin.push({ href: "/admin/r/achievements", label: "Nailiyyətlər", icon: "star" });
      admin.push({ href: "/admin/r/links", label: "Faydalı keçidlər", icon: "link" });
    }
    if (p("settings.manage")) admin.push({ href: "/admin/settings", label: "Sayt parametrləri", icon: "settings" });
    if (p("notifications.broadcast")) admin.push({ href: "/admin/broadcast", label: "Elan göndər", icon: "send" });
    if (p("audit.view")) admin.push({ href: "/admin/audit", label: "Audit jurnalı", icon: "history" });
    groups.push({ label: "İdarəetmə", items: admin });
  }
  return groups;
}
