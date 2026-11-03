"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiClientError } from "@/lib/client/api";
import { Alert } from "@/components/ui/Feedback";

function Verify() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    api<{ message: string }>("/api/auth/verify-email", { body: { token } })
      .then((r) => setState({ ok: true, msg: r.message }))
      .catch((e: ApiClientError) => setState({ ok: false, msg: e.message }));
  }, [token]);
  if (!token) return <Alert tone="danger">Keçid natamamdır.</Alert>;
  if (!state) return <p className="text-ink-3" aria-live="polite">Yoxlanılır…</p>;
  return (
    <>
      <Alert tone={state.ok ? "success" : "danger"}>{state.msg}</Alert>
      <Link href="/login" className="mt-4 inline-block text-primary hover:underline">Girişə keç</Link>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold">E-poçtun təsdiqi</h1>
      <Suspense fallback={null}><Verify /></Suspense>
    </div>
  );
}
