"use client";
import { createPortal } from "react-dom";
import { GraduationCap } from "lucide-react";

const DOTS = 9;

/**
 * Göndərmə zamanı bütün ekranı bulanıqlaşdıran örtük: orbitdə hərəkət edən məzun papağı və
 * arxasında incələn nöqtə izi. Hərəkət azaldılıbsa (prefers-reduced-motion) orbit dayanır, mətn qalır.
 * body-yə portal ilə çəkilir: transform animasiyalı valideyn (giriş vərəqi) `fixed` örtüyü öz içində saxlayardı.
 */
export function AuthLoading({ title, subtitle }: { title: string; subtitle: string }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="login-overlay fixed inset-0 z-50 flex items-center justify-center bg-surface/65 backdrop-blur-xl" role="status" aria-live="polite">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="relative size-24" aria-hidden="true">
          <div className="login-orbit absolute inset-0">
            {Array.from({ length: DOTS }, (_, i) => {
              // Baş (i=0) ən böyük və tünd, iz geriyə doğru kiçilir və solur
              const size = 7 - i * 0.55;
              return (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 rounded-full bg-[var(--login-accent)]"
                  style={{
                    width: size,
                    height: size,
                    opacity: 1 - i / DOTS,
                    transform: `translate(-50%, -50%) rotate(${-i * 17 - 22}deg) translateY(-38px)`,
                  }}
                />
              );
            })}
            <GraduationCap className="absolute left-1/2 top-1/2 size-6 text-[var(--login-accent)]" style={{ transform: "translate(-50%, -50%) translateY(-38px)" }} />
          </div>
        </div>
        <p className="mt-4 font-display text-lg font-bold text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-3">{subtitle}</p>
      </div>
    </div>,
    document.body
  );
}
