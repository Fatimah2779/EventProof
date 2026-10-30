import { CheckCircle2, Clock, XCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";

const statusStyles: Record<string, string> = {
  verified: "bg-success/12 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  manual_review: "bg-warning/15 text-warning-foreground border-warning/40",
  pending: "bg-muted text-muted-foreground border-border",
};
const statusIcons = { verified: CheckCircle2, rejected: XCircle, manual_review: Eye, pending: Clock };

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n();
  const s = (status in statusStyles ? status : "pending") as keyof typeof statusIcons;
  const Icon = statusIcons[s];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", statusStyles[s], className)}>
      <Icon className="h-3.5 w-3.5" />
      {t(s as TKey)}
    </span>
  );
}

const impStyles: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-navy text-navy-foreground",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

export function ImportanceBadge({ importance }: { importance: string }) {
  const { t } = useI18n();
  const k = importance in impStyles ? importance : "medium";
  return <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", impStyles[k])}>{t(k as TKey)}</span>;
}

export function ProgressRing({ value, size = 120, stroke = 10 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * value) / 100}
        className="fill-none stroke-success transition-all duration-700"
      />
    </svg>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}
