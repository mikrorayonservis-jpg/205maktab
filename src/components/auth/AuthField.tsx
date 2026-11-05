"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Giriş və qeydiyyat formalarının ortaq sahəsi: görünən etiket (məcburi sahədə *), 48px hündürlük,
 * 16px şrift (iOS-da avtomatik böyütmə olmur), fokus halqası, kömək/xəta mətni aria-describedby ilə bağlı.
 * type="password" olduqda sağda göstər/gizlət düyməsi.
 */
export function AuthField({
  id,
  label,
  error,
  hint,
  required,
  type = "text",
  className,
  inputClassName,
  ...props
}: Omit<ComponentProps<"input">, "id"> & { id: string; label: ReactNode; error?: string; hint?: ReactNode; inputClassName?: string }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-ink-3/80",
            "transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink-3",
            "focus:border-navy focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--navy)_16%,transparent)] focus:outline-none",
            "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--danger)_14%,transparent)]",
            isPassword && "pr-12",
            inputClassName
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors hover:text-ink"
            aria-label={show ? "Parolu gizlət" : "Parolu göstər"}
            aria-pressed={show}
            aria-controls={id}
          >
            {show ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-ink-3">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

/** Formanın əsas düyməsi: tam en, 52px, tünd kral göyü; yüklənmədə spinner və aria-busy. */
export function AuthSubmit({ loading, children, className, ...props }: ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      className={cn(
        "group inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-navy px-6 text-base font-semibold text-navy-ink",
        "shadow-[0_8px_20px_-12px_rgb(20_43_99/0.7)] transition-[background-color,transform] duration-150 ease-out hover:bg-navy-hover active:scale-[0.985]",
        "disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      {...props}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}
