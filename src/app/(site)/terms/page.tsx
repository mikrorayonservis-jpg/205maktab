import type { Metadata } from "next";
import { getPage } from "@/server/settings";
import { PageIntro } from "@/components/site/parts";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "İstifadə qaydaları", alternates: { canonical: "/terms" } };

export default async function Page() {
  const page = await getPage("terms");
  return (
    <>
      <PageIntro eyebrow="Hüquqi məlumat" title={page?.title_az || "İstifadə qaydaları"} crumbs={[{ label: "İstifadə qaydaları" }]}>
        {page?.updated_at && <p className="text-sm text-ink-3">Son yenilənmə: {formatDate(page.updated_at)}</p>}
      </PageIntro>
      <div className="container-page py-10 md:py-14">
        {page?.content_md ? (
          <div className="card max-w-4xl p-6 sm:p-8 md:p-12">
            <div className="prose-az max-w-[70ch]" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content_md) }} />
          </div>
        ) : (
          <p className="text-ink-3">Mətn administrator tərəfindən əlavə ediləcək.</p>
        )}
      </div>
    </>
  );
}
