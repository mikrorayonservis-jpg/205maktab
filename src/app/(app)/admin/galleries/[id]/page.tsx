import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Alert, PageHeader } from "@/components/ui/Feedback";
import { GalleryMedia } from "./GalleryMedia";

export const metadata: Metadata = { title: "Albom mediası" };

export default async function GalleryMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("gallery.manage", `/admin/galleries/${id}`);
  const g = await db.queryOne<{ id: number; title_az: string; slug: string; is_published: number; contains_minors: number; consent_confirmed: number }>(
    "SELECT id, title_az, slug, is_published, contains_minors, consent_confirmed FROM galleries WHERE id = ? AND deleted_at IS NULL",
    [Number(id) || 0]
  );
  if (!g) notFound();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Qalereya" title={g.title_az} actions={<Link href="/admin/r/galleries" className="text-sm text-primary hover:underline">Albomlara qayıt</Link>} />
      {g.contains_minors && !g.consent_confirmed ? <Alert tone="warning">Albomda şagirdlərin təsviri var və valideyn razılığı təsdiqlənməyib — albom dərc edilə bilməz.</Alert> : null}
      {g.is_published ? <Alert tone="success">Albom saytda dərc edilib: <Link className="underline" href={`/gallery/${g.slug}`}>/gallery/{g.slug}</Link></Alert> : <Alert tone="info">Albom dərc edilməyib.</Alert>}
      <GalleryMedia id={g.id} />
    </div>
  );
}
