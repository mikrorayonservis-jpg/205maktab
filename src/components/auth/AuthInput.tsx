"use client";
import { useState, type ComponentProps } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Giriş formasının sahəsi: solda ikon, daxildə placeholder, fokusda ağ fon və tünd göy çərçivə.
 * Görünən etiket ekran oxuyucular üçün sr-only saxlanılır (placeholder etiket deyil).
 * type="password" olduqda sağda göstər/gizlət düyməsi əlavə olunur.
 */
export function AuthInput({
  id,
  label,
  icon: Icon,
  error,
  type = "text",
  className,
  ...props
}: Omit<ComponentProps<"input">, "id"> & { id: string; label: string; icon: LucideIcon; error?: string }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-3 transition-colors duration-150 group-focus-within:text-[var(--login-accent)]" aria-hidden="true" />
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "h-14 w-full rounded-xl border border-transparent bg-surface-2 pl-11 text-[15px] text-ink placeholder:text-ink-3",
            "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
            "focus:border-[var(--login-accent)] focus:bg-surface focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--login-accent)_14%,transparent)] focus:outline-none",
            "aria-[invalid=true]:border-danger",
            isPassword ? "pr-12" : "pr-4"
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-1.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink"
            aria-label={show ? "Parolu gizlət" : "Parolu göstər"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
