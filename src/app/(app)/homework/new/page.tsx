import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/Feedback";
import { HomeworkForm } from "@/components/app/HomeworkForm";

export const metadata: Metadata = { title: "Yeni ev tapşırığı" };

export default async function NewHomeworkPage() {
  const u = await requirePageUser("/homework/new");
  if (!u.teacherId && !can(u, "school.manage")) notFound();
  return (
    <div>
      <PageHeader title="Yeni ev tapşırığı" description="Tapşırıq verildikdə sinfin şagirdlərinə və valideynlərinə bildiriş göndərilir." />
      <HomeworkForm />
    </div>
  );
}
