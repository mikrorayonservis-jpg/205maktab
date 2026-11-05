"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Img {
  id: number;
  image_url: string;
  caption_az: string | null;
  alt_text: string | null;
}

/**
 * Şəkil şəbəkəsi + lightbox: klaviatura (← → Esc), toxunma ilə sürüşdürmə, yüklənmə göstəricisi.
 * `feature` rejimində ilk şəkil böyük göstərilir (albom səhifəsi üçün redaksiya düzülüşü).
 */
export function GalleryGrid({ images, feature = false }: { images: Img[]; feature?: boolean }) {
  const [index, setIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const big = feature && images.length >= 5;

  const close = useCallback(() => {
    setIndex(null);
    dialog.current?.close();
    opener.current?.focus();
  }, []);
  const move = useCallback(
    (d: number) => {
      if (images.length < 2) return;
      setLoading(true);
      setIndex((i) => (i === null ? null : (i + d + images.length) % images.length));
    },
    [images.length]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    // Qonşu şəkilləri əvvəlcədən yüklə (keçid ani olsun)
    for (const d of [1, -1]) {
      const n = images[(index + d + images.length) % images.length];
      if (n) new Image().src = n.image_url;
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [index, move, images]);

  const current = index !== null ? images[index] : null;
  const label = (img: Img, i: number) => img.alt_text || img.caption_az || `${i + 1}-ci şəkil`;

  return (
    <>
      <ul className={cn("grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4", big && "md:grid-flow-dense")}>
        {images.map((img, i) => (
          <li key={img.id} className={cn(big && i === 0 && "col-span-2 row-span-2")}>
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setLoading(true);
                setIndex(i);
                dialog.current?.showModal();
              }}
              className="group relative block size-full overflow-hidden rounded-xl bg-surface-2"
              aria-label={`Şəkli böyüt: ${label(img, i)}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.image_url}
                alt={img.alt_text || img.caption_az || ""}
                loading={i < 4 ? "eager" : "lazy"}
                decoding="async"
                className="card-zoom aspect-square size-full object-cover group-hover:scale-[1.035]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[#061e46]/45 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
              <Maximize2 className="absolute bottom-2.5 right-2.5 size-4 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-[#030a17]/97 p-0 text-white backdrop:bg-black/80"
        aria-label="Şəkil baxışı"
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm sm:px-5">
              <span className="tabular-nums text-white/80" aria-live="polite">{(index ?? 0) + 1} / {images.length}</span>
              <button type="button" onClick={close} className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Bağla">
                <X className="size-5" />
              </button>
            </div>
            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 sm:px-16"
              onPointerDown={(e) => {
                if (e.pointerType !== "mouse") touch.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                const t = touch.current;
                touch.current = null;
                if (!t) return;
                const dx = e.clientX - t.x;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - t.y)) move(dx < 0 ? 1 : -1);
              }}
              onPointerCancel={() => (touch.current = null)}
            >
              {loading && <Loader2 className="absolute size-8 animate-spin text-white/70" aria-hidden="true" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={current.id}
                src={current.image_url}
                alt={current.alt_text || current.caption_az || ""}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                draggable={false}
                className={cn("max-h-full max-w-full select-none rounded-md object-contain transition-opacity duration-200", loading ? "opacity-0" : "opacity-100")}
              />
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => move(-1)} className="absolute left-2 hidden size-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:inline-flex" aria-label="Əvvəlki şəkil">
                    <ChevronLeft className="size-6" />
                  </button>
                  <button type="button" onClick={() => move(1)} className="absolute right-2 hidden size-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:inline-flex" aria-label="Növbəti şəkil">
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:justify-center sm:px-5">
              {images.length > 1 && (
                <button type="button" onClick={() => move(-1)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 sm:hidden" aria-label="Əvvəlki şəkil">
                  <ChevronLeft className="size-5" />
                </button>
              )}
              <p className="min-h-5 flex-1 text-center text-sm text-white/85 sm:max-w-2xl">{current.caption_az}</p>
              {images.length > 1 && (
                <button type="button" onClick={() => move(1)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 sm:hidden" aria-label="Növbəti şəkil">
                  <ChevronRight className="size-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
