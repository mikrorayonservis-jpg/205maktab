"use client";
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  inputClassName?: string;
};

/**
 * Giriş və qeydiyyat formalarının ortaq sahəsi: kiçik etiket (məcburi sahədə *), ağ "həb" sahə, solda ikon,
 * 16px şrift (iOS-da avtomatik böyütmə olmur), fokus halqası, kömək/xəta mətni aria-describedby ilə bağlı.
 * type="password" olduqda sağda göstər/gizlət düyməsi. ref — xəta olanda sahəyə fokus vermək üçün.
 */
export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField(
  { id, label, error, hint, icon: Icon, required, type = "text", className, inputClassName, ...props },
  ref
) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block pl-1 text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      <div className="group relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 size-[17px] -translate-y-1/2 text-ink-3 transition-colors duration-150 group-focus-within:text-navy"
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={id}
          type={isPassword && show ? "text" : type}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-full border border-[var(--auth-field-line)] bg-surface text-base text-ink shadow-[0_1px_0_rgb(16_24_40/0.03)] placeholder:text-ink-3/75",
            Icon ? "pl-11" : "pl-4",
            isPassword ? "pr-12" : "pr-4",
            "transition-[border-color,box-shadow] duration-150 ease-out hover:border-line-strong",
            "focus:border-navy focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--navy)_14%,transparent)] focus:outline-none",
            "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--danger)_14%,transparent)]",
            inputClassName
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label={show ? "Parolu gizlət" : "Parolu göstər"}
            aria-pressed={show}
            aria-controls={id}
          >
            {show ? <EyeOff className="size-[17px]" aria-hidden="true" /> : <Eye className="size-[17px]" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1 pl-1 text-xs leading-snug text-ink-3">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 pl-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});

/** Formanın əsas düyməsi: tam en, 48px həb, tünd kral göyü; yüklənmədə spinner və aria-busy. */
export function AuthSubmit({ loading, disabled, children, className, ...props }: ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={cn(
        "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-navy px-6 text-[15px] font-semibold text-navy-ink",
        "shadow-[0_10px_24px_-14px_rgb(20_43_99/0.75)] transition-[background-color,transform] duration-150 ease-out hover:bg-navy-hover active:scale-[0.985]",
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

/** "və ya" ayırıcısı (referansdakı nöqtəli xətt) */
export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-3" role="separator" aria-label={typeof children === "string" ? children : undefined}>
      <span className="h-px flex-1 bg-[linear-gradient(to_left,var(--line-strong),transparent)]" aria-hidden="true" />
      <span className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
      <span>{children}</span>
      <span className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
      <span className="h-px flex-1 bg-[linear-gradient(to_right,var(--line-strong),transparent)]" aria-hidden="true" />
    </div>
  );
}

/** İkinci dərəcəli həb keçid (məs. "Daxil olun") */
export const authSecondaryClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--auth-field-line)] bg-surface px-6 text-[15px] font-semibold text-ink transition-[border-color,background-color,transform] duration-150 ease-out hover:border-line-strong hover:bg-surface-2 active:scale-[0.985]";
