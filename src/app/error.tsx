"use client";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-[60vh] items-center py-16">
      <div className="container-page flex flex-col items-center text-center">
        <div className="rule-gold" aria-hidden="true" />
        <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">Gözlənilməz xəta baş verdi</h1>
        <p className="mt-3 max-w-md text-ink-2">Səhifəni yükləmək mümkün olmadı. Bir az sonra yenidən cəhd edin. Problem davam edərsə, administratora müraciət edin.</p>
        {error.digest && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-1 font-mono text-xs text-ink-3">Kod: {error.digest}</p>}
        <button onClick={reset} className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-navy px-5 text-[15px] font-semibold text-navy-ink hover:bg-navy-hover">
          <RotateCcw className="size-4" aria-hidden="true" /> Yenidən cəhd et
        </button>
      </div>
    </main>
  );
}
