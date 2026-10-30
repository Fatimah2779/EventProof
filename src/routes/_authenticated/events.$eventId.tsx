import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, FileBarChart, Loader2, MapPin, Calendar, Users, AlertTriangle, Trash2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventQuery, type CriterionRow } from "@/lib/data";
import { countByStatus, readiness } from "@/lib/readiness";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Bar, ImportanceBadge, ProgressRing, StatusBadge } from "@/components/ep/ui-bits";
import { CriterionSheet } from "@/components/ep/CriterionSheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event readiness — EventProof" },
      { name: "description", content: "Tasks, criteria, evidence and readiness for this event." },
      { property: "og:title", content: "Event readiness — EventProof" },
      { property: "og:description", content: "Tasks, criteria, evidence and readiness for this event." },
    ],
  }),
  component: EventPage,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const { t } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(eventQuery(eventId));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-success" />;
  if (error || !data) return <p className="text-destructive">{t("error")}: {(error as Error)?.message}</p>;

  const { event, tasks, criteria, evidence } = data;
  const pct = readiness(criteria);
  const counts = countByStatus(criteria);
  const criticalOpen = criteria.filter((c) => c.mandatory && c.status !== "verified" && (c.importance === "critical" || c.importance === "high"));
  const mandatoryOpen = criteria.some((c) => c.mandatory && c.status !== "verified");
  const selectedCrit = criteria.find((c) => c.id === selected) ?? null;
  const allCollapsed = tasks.every((tk) => collapsed[tk.id]);

  async function del() {
    if (!confirm(t("confirmDelete"))) return;
    await supabase.from("events").delete().eq("id", eventId);
    await qc.invalidateQueries({ queryKey: ["events"] });
    nav({ to: "/events" });
  }

  const stats = [
    { k: "verified", v: counts.verified, cls: "text-success" },
    { k: "pending", v: counts.pending, cls: "text-muted-foreground" },
    { k: "rejected", v: counts.rejected, cls: "text-destructive" },
    { k: "manual_review", v: counts.manual_review, cls: "text-warning-foreground" },
  ] as const;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-success">{event.event_type}</div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {event.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{event.location}</span>}
            {event.event_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{event.event_date}</span>}
            {event.visitors != null && <span className="flex items-center gap-1"><Users className="h-4 w-4" />{event.visitors.toLocaleString()}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/report/$eventId" params={{ eventId }}><FileBarChart className="h-4 w-4" />{t("report")}</Link></Button>
          <Button variant="ghost" size="icon" aria-label={t("deleteEvent")} onClick={del}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="flex items-center gap-6 rounded-2xl bg-navy p-6 text-navy-foreground shadow-card">
          <div className="relative">
            <ProgressRing value={pct} />
            <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold">{pct}%</div>
          </div>
          <div>
            <div className="font-semibold">{t("readiness")}</div>
            <div className="text-sm text-navy-foreground/70">{counts.verified} {t("of")} {criteria.length} {t("criteriaVerified")}</div>
            {mandatoryOpen && <div className="mt-2 text-xs text-navy-foreground/60">{t("mandatoryBlock")}</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.k} className="rounded-xl border bg-card p-4 shadow-card">
              <div className={cn("font-display text-3xl font-bold", s.cls)}>{s.v}</div>
              <div className="text-sm text-muted-foreground">{t(s.k)}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" />{t("criticalOpen")}</div>
          {criticalOpen.length === 0 ? <p className="text-sm text-success">{t("noneOpen")}</p> : (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
              {criticalOpen.map((c) => (
                <li key={c.id}><button className="flex w-full items-center justify-between gap-2 text-start hover:text-primary" onClick={() => setSelected(c.id)}><span className="truncate">{c.title}</span><StatusBadge status={c.status} /></button></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("tasks")}</h2>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(Object.fromEntries(tasks.map((tk) => [tk.id, !allCollapsed])))}>
          {allCollapsed ? t("expandAll") : t("collapseAll")}
        </Button>
      </div>

      <div className="space-y-5">
        {tasks.map((task, i) => {
          const crits = criteria.filter((c) => c.task_id === task.id);
          const tp = readiness(crits);
          const isOpen = !collapsed[task.id];
          return (
            <section key={task.id} className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-card shadow-card">
              <button className="flex w-full items-center gap-4 p-5 text-start hover:bg-muted/40" onClick={() => setCollapsed({ ...collapsed, [task.id]: isOpen })}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy font-bold text-navy-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold">{task.title}</h3>
                  {task.description && <p className="line-clamp-1 text-sm text-muted-foreground">{task.description}</p>}
                  <div className="mt-2 flex items-center gap-3"><div className="max-w-xs flex-1"><Bar value={tp} /></div><span className="text-sm font-semibold tabular-nums">{tp}%</span><span className="text-xs text-muted-foreground">{crits.filter((c) => c.status === "verified").length}/{crits.length}</span></div>
                </div>
                <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="border-t bg-muted/30 p-5">
                  {task.source_ref && <p className="mb-3 text-xs text-muted-foreground">{t("source")}: {task.source_ref}</p>}
                  <div className="grid gap-3 border-s-2 border-success/40 ps-4 sm:grid-cols-2 lg:grid-cols-3">
                    {crits.map((c) => <CritCard key={c.id} c={c} count={evidence.filter((e) => e.criterion_id === c.id).length} onClick={() => setSelected(c.id)} />)}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <CriterionSheet
        criterion={selectedCrit}
        evidence={evidence.filter((e) => e.criterion_id === selected)}
        eventId={eventId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function CritCard({ c, count, onClick }: { c: CriterionRow; count: number; onClick: () => void }) {
  const { t } = useI18n();
  const border = { verified: "border-success/50", rejected: "border-destructive/50", manual_review: "border-warning/60" }[c.status] ?? "border-border";
  return (
    <button onClick={onClick} className={cn("flex flex-col gap-2 rounded-xl border-2 bg-card p-4 text-start transition hover:-translate-y-0.5 hover:shadow-card", border)}>
      <div className="flex items-center justify-between gap-2">
        <ImportanceBadge importance={c.importance} />
        <StatusBadge status={c.status} />
      </div>
      <div className="font-medium leading-snug">{c.title}</div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>{c.mandatory ? t("mandatory") : t("optional")} · {t("weight")} {c.weight}</span>
        <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{count}</span>
      </div>
    </button>
  );
}
