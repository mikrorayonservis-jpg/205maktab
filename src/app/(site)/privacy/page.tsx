import type { Metadata } from "next";
import { getPage } from "@/server/settings";
import { PageIntro } from "@/components/site/parts";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Məxfilik siyasəti", alternates: { canonical: "/privacy" } };

export default async function Page() {
  const page = await getPage("privacy");
  return (
    <>
      <PageIntro title={page?.title_az || "Məxfilik siyasəti"} crumbs={[{ label: "Məxfilik siyasəti" }]}>
        {page?.updated_at && <p className="text-sm">Son yenilənmə: {formatDate(page.updated_at)}</p>}
      </PageIntro>
      <div className="container-page py-10">
        {page?.content_md ? (
          <div className="prose-az max-w-[70ch]" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content_md) }} />
        ) : (
          <p className="text-ink-3">Mətn administrator tərəfindən əlavə ediləcək.</p>
        )}
      </div>
    </>
  );
}
