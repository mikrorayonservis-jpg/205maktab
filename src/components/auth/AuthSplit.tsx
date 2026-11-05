import Image from "next/image";
import type { ReactNode } from "react";
import { AuthHeader } from "./AuthHeader";

/**
 * Giriş və qeydiyyatın ortaq kompozisiyası.
 *  - Desktop (lg+): solda məktəbin təqdimatı və real bina fotosu, sağda forma kartı; yumşaq göy fon.
 *  - Telefon: kompakt başlıq, sonra forma tam endə açıq boz fonda (kart çərçivəsi yoxdur, foto göstərilmir).
 */
export function AuthSplit({ headline, lead, children }: { headline: ReactNode; lead: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-surface">
      <AuthHeader />
      <main id="main" className="flex-1 [background:var(--auth-bg)]">
        <div className="container-page grid gap-12 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-start lg:gap-14 lg:py-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] xl:gap-20">
          <section aria-label="Məktəb" className="hidden lg:flex lg:flex-col">
            <span className="rule-gold" aria-hidden="true" />
            <p className="mt-6 max-w-md font-display text-[2.5rem] font-bold leading-[1.12] tracking-[-0.02em] text-ink">{headline}</p>
            <p className="mt-3 max-w-md text-lg text-ink-2">{lead}</p>
            <div className="relative mt-10 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-lift">
              <Image
                src="/assets/images/mekteb-bina-1438.webp"
                alt="Rövşən İmanov adına 205 nömrəli tam orta məktəbin binası"
                width={1438}
                height={1094}
                priority
                sizes="(min-width: 1280px) 46vw, 50vw"
                className="aspect-[16/11] w-full object-cover object-[50%_45%]"
              />
              <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-lg border border-line bg-surface/95 px-3.5 py-2.5 shadow-lift">
                <Image src="/assets/logo/logo-128.webp" alt="" width={40} height={40} className="size-10 object-contain" />
                <span className="leading-tight">
                  <span className="block text-xs text-ink-3">Milli Qəhrəman</span>
                  <span className="block font-display text-sm font-bold text-ink">Rövşən İmanovun adını daşıyır</span>
                </span>
              </div>
            </div>
          </section>
          <div className="auth-rise mx-auto w-full max-w-[34rem] lg:max-w-none">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Forma kartı: telefonda çərçivəsiz (tam en), sm+ ekranlarda kölgəli kart. */
export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="sm:rounded-2xl sm:border sm:border-line sm:bg-surface sm:p-8 sm:shadow-lift">{children}</div>;
}

export function AuthTitle({ title, subtitle, centered, emblem }: { title: string; subtitle?: ReactNode; centered?: boolean; emblem?: boolean }) {
  return (
    <header className={centered ? "text-center" : undefined}>
      {emblem && (
        // Məktəb gerbi yumşaq işıq halqası içində (referansdakı ay/işıq kompozisiyasının məktəb variantı)
        <span className="relative mx-auto mb-4 flex size-16 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-[-14px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--navy)_16%,transparent),transparent)]" />
          <span className="relative flex size-16 items-center justify-center rounded-full border border-[var(--auth-field-line)] bg-surface shadow-[0_8px_24px_-14px_rgb(20_43_99/0.5)]">
            <Image src="/assets/logo/logo-128.webp" alt="" width={44} height={44} className="size-11 object-contain" />
          </span>
        </span>
      )}
      <h1 className="font-display text-[1.6rem] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[1.85rem]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
    </header>
  );
}
