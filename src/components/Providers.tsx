"use client";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ToastProvider } from "./ui/Toast";

export function Providers({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
