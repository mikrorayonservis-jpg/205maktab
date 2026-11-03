"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-2xl font-semibold">Gözlənilməz xəta baş verdi</h1>
      <p className="mt-2 max-w-md text-ink-3">Səhifəni yükləmək mümkün olmadı. Bir az sonra yenidən cəhd edin. Problem davam edərsə, administratora müraciət edin.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-3">Kod: {error.digest}</p>}
      <button onClick={reset} className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-ink">Yenidən cəhd et</button>
    </main>
  );
}
