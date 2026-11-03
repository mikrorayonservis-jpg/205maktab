"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn("inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink", className)}
      aria-label={dark ? "Açıq rejimə keç" : "Qaranlıq rejimə keç"}
      title={dark ? "Açıq rejim" : "Qaranlıq rejim"}
    >
      {mounted ? dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" /> : <span className="size-[18px]" />}
    </button>
  );
}
