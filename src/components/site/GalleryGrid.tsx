"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Img {
  id: number;
  image_url: string;
  caption_az: string | null;
  alt_text: string | null;
}

/** Şəkil şəbəkəsi və klaviatura ilə idarə olunan lightbox. */
export function GalleryGrid({ images }: { images: Img[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIndex(null);
    dialog.current?.close();
    opener.current?.focus();
  }, []);
  const move = useCallback((d: number) => setIndex((i) => (i === null ? null : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, move]);

  const current = index !== null ? images[index] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setIndex(i);
                dialog.current?.showModal();
              }}
              className="group block w-full overflow-hidden rounded-md bg-surface-2"
              aria-label={`Şəkli böyüt: ${img.alt_text || img.caption_az || `${i + 1}-ci şəkil`}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt={img.alt_text || img.caption_az || ""} loading="lazy" decoding="async" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
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
        className="m-0 h-full max-h-none w-full max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        aria-label="Şəkil baxışı"
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-3 text-sm">
              <span>{(index ?? 0) + 1} / {images.length}</span>
              <button type="button" onClick={close} className="inline-flex size-10 items-center justify-center rounded-md hover:bg-white/10" aria-label="Bağla">
                <X className="size-5" />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
              <button type="button" onClick={() => move(-1)} className="absolute left-2 inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Əvvəlki şəkil">
                <ChevronLeft className="size-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.image_url} alt={current.alt_text || current.caption_az || ""} className="max-h-full max-w-full object-contain" />
              <button type="button" onClick={() => move(1)} className="absolute right-2 inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Növbəti şəkil">
                <ChevronRight className="size-6" />
              </button>
            </div>
            {current.caption_az && <p className="p-4 text-center text-sm text-white/85">{current.caption_az}</p>}
          </div>
        )}
      </dialog>
    </>
  );
}
