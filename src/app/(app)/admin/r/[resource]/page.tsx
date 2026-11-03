import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { getResource } from "@/config/admin-resources";
import { PageHeader } from "@/components/ui/Feedback";
import { ResourceManager } from "@/components/admin/ResourceManager";

type Props = { params: Promise<{ resource: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const def = getResource((await params).resource);
  return { title: def?.title ?? "İdarəetmə" };
}

export default async function ResourcePage({ params }: Props) {
  const { resource } = await params;
  const def = getResource(resource);
  const u = await requirePageUser(`/admin/r/${resource}`);
  if (!def || !can(u, def.permission)) notFound();
  return (
    <div>
      <PageHeader eyebrow="İdarəetmə" title={def.title} description={def.description} />
      <ResourceManager resourceKey={def.key} />
    </div>
  );
}
