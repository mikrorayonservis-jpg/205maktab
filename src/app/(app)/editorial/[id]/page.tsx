import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { editorialGet, NEWS_STATUS, type NewsStatus } from "@/server/news";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/Feedback";
import { ArticleEditor } from "@/components/app/ArticleEditor";
import { WorkflowActions } from "./WorkflowActions";
import { STATUS_TONE } from "@/components/app/news-status";

export const metadata: Metadata = { title: "Məqalə" };

const ACTION_LABEL: Record<string, string> = {
  create: "Yaradıldı", edit: "Redaktə edildi", submit: "Yoxlamaya göndərildi", request_changes: "Düzəliş istənildi", approve: "Təsdiqləndi",
  reject: "Rədd edildi", publish: "Dərc edildi", unpublish: "Dərcdən çıxarıldı", restore: "Qaralamaya qaytarıldı",
};

export default async function ArticleAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requirePagePermission(["news.submit", "news.review", "news.publish", "news.edit_any"], `/editorial/${id}`);
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const data = await editorialGet(u, n).catch(() => null);
  if (!data) notFound();
  const a = data.article;
  const status = a.status as NewsStatus;
  const actions: { action: string; label: string; tone: "primary" | "secondary" | "danger"; needsNote?: boolean }[] = [];
  const own = a.created_by === u.id;
  if (status === "draft" && (own || can(u, "news.edit_any"))) actions.push({ action: "submit", label: "Yoxlamaya göndər", tone: "primary" });
  if (status === "pending" && can(u, "news.review")) actions.push({ action: "approve", label: "Təsdiqlə", tone: "primary" }, { action: "request_changes", label: "Düzəliş istə", tone: "secondary", needsNote: true }, { action: "reject", label: "Rədd et", tone: "danger", needsNote: true });
  if (status === "approved" && can(u, "news.publish")) actions.push({ action: "publish", label: "Dərc et", tone: "primary" });
  if (status === "approved" && can(u, "news.review")) actions.push({ action: "request_changes", label: "Düzəliş istə", tone: "secondary", needsNote: true });
  if (status === "published" && can(u, "news.publish")) actions.push({ action: "unpublish", label: "Dərcdən çıxar", tone: "danger", needsNote: true });
  if (status === "archived" && can(u, "news.edit_any")) actions.push({ action: "restore", label: "Qaralamaya qaytar", tone: "secondary" });
  const canDelete = can(u, "news.edit_any") || (own && status === "draft");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Redaksiya"
        title={a.title_az}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[status]}>{NEWS_STATUS[status]}</Badge><span>Müəllif: {a.author_name || "—"}</span>{a.published_at && <span>· Dərc: {formatDateTime(a.published_at)}</span>}</span>}
        actions={status === "published" && <Link href={`/news/${a.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong px-3 text-sm hover:bg-surface-2"><ExternalLink className="size-4" aria-hidden="true" /> Saytda bax</Link>}
      />
      {a.review_note && (status === "draft" || status === "archived") && <Alert tone="warning" title="Redaktorun qeydi"><p className="whitespace-pre-line">{a.review_note}</p></Alert>}
      {Boolean(a.contains_minors) && !a.consent_confirmed && <Alert tone="warning">Məqalədə şagirdlərin təsviri var. Valideyn razılığı təsdiqlənmədən dərc edilə bilməz.</Alert>}
      {(actions.length > 0 || canDelete) && <WorkflowActions id={a.id} actions={actions} canDelete={canDelete} />}
      {!data.canEdit && <Alert tone="info">Bu vəziyyətdə məqaləni redaktə edə bilməzsiniz.{own && status !== "draft" ? " Redaktor düzəliş istəsə, məqalə qaralamaya qayıdacaq." : ""}</Alert>}
      <ArticleEditor
        readOnly={!data.canEdit}
        perms={{ canUpload: can(u, "media.upload"), canConsent: can(u, "news.review") || can(u, "news.publish"), canFeature: can(u, "news.publish") }}
        initial={{
          id: a.id, title: a.title_az, summary: a.summary_az ?? "", content: a.content_az, categoryId: a.category_id ? String(a.category_id) : "",
          coverImage: a.cover_image ?? "", coverAlt: a.cover_alt_az ?? "", byline: a.byline_az ?? "", seoTitle: a.seo_title_az ?? "", seoDescription: a.seo_description_az ?? "",
          containsMinors: Boolean(a.contains_minors), consentConfirmed: Boolean(a.consent_confirmed), isFeatured: Boolean(a.is_featured), galleryId: a.gallery_id ? String(a.gallery_id) : "",
        }}
      />
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Dəyişiklik tarixçəsi</h2>
        <ol className="space-y-3 border-l border-line pl-4">
          {data.history.map((h: Record<string, any>) => (
            <li key={h.id} className="text-sm">
              <p><span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span>{h.status_to && h.status_from !== h.status_to ? <span className="text-ink-3"> → {NEWS_STATUS[h.status_to as NewsStatus]}</span> : null}</p>
              <p className="text-xs text-ink-3">{h.user_name || h.email} · {formatDateTime(h.created_at)}</p>
              {h.change_reason && <p className="mt-1 whitespace-pre-line text-ink-2">{h.change_reason}</p>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
