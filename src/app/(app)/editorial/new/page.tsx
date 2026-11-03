import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/Feedback";
import { ArticleEditor } from "@/components/app/ArticleEditor";

export const metadata: Metadata = { title: "Yeni məqalə" };

export default async function NewArticlePage() {
  const u = await requirePagePermission("news.submit", "/editorial/new");
  return (
    <div>
      <PageHeader title="Yeni məqalə" description="Məqalə qaralama kimi saxlanılır. Hazır olduqda “Yoxlamaya göndər” düyməsini sıxın." />
      <ArticleEditor perms={{ canUpload: can(u, "media.upload"), canConsent: can(u, "news.review") || can(u, "news.publish"), canFeature: can(u, "news.publish") }} />
    </div>
  );
}
