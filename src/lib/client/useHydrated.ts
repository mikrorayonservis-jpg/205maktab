"use client";
import { useEffect, useState } from "react";

/**
 * JavaScript yüklənib forma işləyicisi bağlanana qədər false. Yavaş telefonda düymə hidrasiyadan əvvəl
 * basılanda forma brauzer tərəfindən göndərilib səhifə sıfırlanırdı ("donub qalır") — düymə o vaxta qədər bağlı qalır.
 */
export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
