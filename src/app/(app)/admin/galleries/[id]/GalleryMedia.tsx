"use client";
import { useCallback, useEffect, useState } from "react";
import { PlayCircle, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Alert, Card, EmptyState } from "@/components/ui/Feedback";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";

interface Img { id: number; image_url: string; caption_az: string | null; alt_text: string | null; sort_order: number }
interface Vid { id: number; title_az: string | null; provider: string; video_id: string }

export function GalleryMedia({ id }: { id: number }) {
  const toast = useToast();
  const [data, setData] = useState<{ images: Img[]; videos: Vid[] } | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const { loading, error, fields, run } = useSubmit();
  const load = useCallback(() => { api<{ images: Img[]; videos: Vid[] }>(`/api/admin/galleries/${id}/images`).then(setData).catch(() => setData({ images: [], videos: [] })); }, [id]);
  useEffect(load, [load]);
  async function addImage(u: string) {
    await api(`/api/admin/galleries/${id}/images`, { body: { images: [{ url: u }] } }).then(load).catch((e) => toast.error(e.message));
  }
  async function saveImage(img: Img, caption: string, alt: string) {
    await api(`/api/admin/galleries/${id}/images/${img.id}`, { method: "PATCH", body: { caption, alt } }).then(() => toast.success("Yadda saxlanıldı.")).catch((e) => toast.error(e.message));
  }
  async function removeImage(imgId: number) {
    await api(`/api/admin/galleries/${id}/images/${imgId}`, { method: "DELETE" }).then(load).catch((e) => toast.error(e.message));
  }
  async function addVideo() {
    const r = await run(() => api(`/api/admin/galleries/${id}/videos`, { body: { url, title } }));
    if (r) { setUrl(""); setTitle(""); load(); }
  }
  async function removeVideo(vid: number) {
    await api(`/api/admin/galleries/${id}/videos/${vid}`, { method: "DELETE" }).then(load).catch((e) => toast.error(e.message));
  }
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Şəkillər</h2>
          <FileUpload purpose="gallery" accept="image/jpeg,image/png,image/webp" label="Şəkil yüklə" onUploaded={(f) => addImage(f.url)} />
        </div>
        <p className="mb-4 text-xs text-ink-3">Şəkillər avtomatik WebP formatına çevrilir, ölçüsü azaldılır və EXIF/GPS məlumatları silinir.</p>
        {!data ? null : data.images.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.images.map((img) => <ImageCard key={img.id} img={img} onSave={saveImage} onRemove={() => removeImage(img.id)} />)}
          </ul>
        ) : <EmptyState title="Şəkil yoxdur" />}
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Videolar (YouTube / Vimeo)</h2>
        <div className="flex flex-wrap items-end gap-3">
          {error && <Alert tone="danger" className="w-full">{error}</Alert>}
          <FormField id="v-url" label="Video keçidi" error={fields.url} className="w-full flex-1 sm:w-auto sm:min-w-72"><Input id="v-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></FormField>
          <FormField id="v-title" label="Başlıq" className="w-full sm:w-auto sm:min-w-56"><Input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
          <Button onClick={addVideo} loading={loading}>Əlavə et</Button>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {data?.videos.map((v) => <li key={v.id} className="flex items-center gap-3 py-2 text-sm"><PlayCircle className="size-4 text-ink-3" aria-hidden="true" /><span className="flex-1">{v.title_az || v.video_id} <span className="text-ink-3">({v.provider})</span></span><Button size="sm" variant="ghost" className="text-danger" onClick={() => removeVideo(v.id)} aria-label="Videonu sil"><Trash2 className="size-4" /></Button></li>)}
        </ul>
      </Card>
    </div>
  );
}

function ImageCard({ img, onSave, onRemove }: { img: Img; onSave: (i: Img, c: string, a: string) => void; onRemove: () => void }) {
  const [caption, setCaption] = useState(img.caption_az || "");
  const [alt, setAlt] = useState(img.alt_text || "");
  return (
    <li className="overflow-hidden rounded-lg border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.image_url} alt={alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
      <div className="space-y-2 p-3">
        <Input aria-label="Şəklin alt yazısı" placeholder="Alt yazı" value={caption} onChange={(e) => setCaption(e.target.value)} className="h-8" maxLength={255} />
        <Input aria-label="Alternativ mətn" placeholder="Alternativ mətn (əlçatanlıq)" value={alt} onChange={(e) => setAlt(e.target.value)} className="h-8" maxLength={255} />
        <div className="flex justify-between">
          <Button size="sm" variant="secondary" onClick={() => onSave(img, caption, alt)}>Yadda saxla</Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={onRemove} aria-label="Şəkli sil"><Trash2 className="size-4" /></Button>
        </div>
      </div>
    </li>
  );
}
