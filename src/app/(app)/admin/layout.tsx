import { requirePagePermission } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("admin.access", "/admin");
  return <>{children}</>;
}
