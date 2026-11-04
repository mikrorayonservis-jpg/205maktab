"use client";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

// Hər route qrupu öz açarı ilə qurur (bax @/lib/theme-keys).
export function ThemeScope({ storageKey, nonce, children }: { storageKey: string; nonce?: string; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey={storageKey} nonce={nonce}>
      {children}
    </ThemeProvider>
  );
}
