"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Uzun səhifələrdə yuxarı qayıtma düyməsi (bir ekran hündürlüyündən sonra görünür). */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShow(window.scrollY > window.innerHeight * 1.2));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
      className="fade-in fixed bottom-5 right-4 z-30 inline-flex size-12 items-center justify-center rounded-full bg-navy text-navy-ink shadow-lift ring-1 ring-white/25 transition-colors hover:bg-navy-hover sm:bottom-8 sm:right-8"
      aria-label="Səhifənin yuxarısına qayıt"
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
