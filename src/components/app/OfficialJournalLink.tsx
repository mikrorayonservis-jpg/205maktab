"use client";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function csrf(): string {
  const m = document.cookie.split("; ").find((c) => c.startsWith("q205_csrf="));
  return m ? decodeURIComponent(m.slice(10)) : "";
}

/**
 * Rəsmi portalı yeni tabda açan adi keçid. Klik zamanı yalnız "keçid edildi" faktı qeyd olunur (keepalive),
 * keçidin özü sorğunun nəticəsindən asılı deyil. Heç bir token, cookie və ya şəxsi məlumat ötürülmür.
 */
export function OfficialJournalLink({ href, target, label, primary }: { href: string; target: "jurnal" | "digital"; label: string; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      onClick={() => {
        try {
          fetch("/api/official-journal/open", {
            method: "POST",
            keepalive: true,
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() },
            body: JSON.stringify({ target }),
          }).catch(() => undefined);
        } catch {
          /* qeyd uğursuz olsa belə keçid açılır */
        }
      }}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors",
        primary ? "bg-primary text-primary-ink hover:bg-primary-hover" : "border border-line-strong bg-surface text-ink hover:bg-surface-2"
      )}
    >
      {label} <ExternalLink className="size-4" aria-hidden="true" />
      <span className="sr-only">(yeni tabda açılır)</span>
    </a>
  );
}
