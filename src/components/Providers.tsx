"use client";
import type { ReactNode } from "react";
import { ToastProvider } from "./ui/Toast";

// Mövzu provayderi burada deyil: hər route qrupu öz ThemeScope-unu qurur (bax ThemeScope.tsx).
export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
