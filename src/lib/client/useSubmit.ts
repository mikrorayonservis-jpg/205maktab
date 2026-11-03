"use client";
import { useState } from "react";
import { ApiClientError } from "./api";

/** Forma göndərişi: yüklənmə, sahə xətaları və ümumi xəta vəziyyəti. */
export function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setLoading(true);
    setError(null);
    setFields({});
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(e.message);
        setFields(e.fields || {});
      } else {
        setError("Gözlənilməz xəta baş verdi.");
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  }
  /** Göndərməzdən əvvəl brauzerdə aşkarlanan sahə xətaları (server də eyni qaydanı yoxlayır). */
  function invalid(f: Record<string, string>) {
    setError("Formada səhvlər var.");
    setFields(f);
  }
  return { loading, error, fields, run, setError, invalid };
}
