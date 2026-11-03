import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";
const tones: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "border-primary/25 bg-primary-soft text-ink", Icon: Info },
  success: { cls: "border-success/30 bg-success-soft text-ink", Icon: CheckCircle2 },
  warning: { cls: "border-warning/30 bg-warning-soft text-ink", Icon: AlertTriangle },
  danger: { cls: "border-danger/30 bg-danger-soft text-ink", Icon: XCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-3.5 text-sm", cls, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary")} aria-hidden="true" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, icon, action }: { title: string; children?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="mb-3 text-ink-3" aria-hidden="true">{icon ?? <Inbox className="size-8" />}</div>
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-ink-3">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

type BadgeTone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "gold";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  primary: "bg-primary-soft text-primary",
  accent: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  gold: "bg-gold-soft text-gold",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", badgeTones[tone], className)}>{children}</span>;
}

export function Card({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <Tag className={cn("rounded-lg border border-line bg-surface", className)}>{children}</Tag>;
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-ink-3">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "primary" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "primary" | "accent" | "gold" | "danger" }) {
  const bar = { primary: "bg-primary", accent: "bg-accent", gold: "bg-gold", danger: "bg-danger" }[tone];
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface p-4">
      <span className={cn("absolute inset-y-0 left-0 w-1", bar)} aria-hidden="true" />
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
