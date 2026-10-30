import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventQuery } from "@/lib/data";
import { countByStatus, readiness } from "@/lib/readiness";
import { useI18n } from "@/lib/i18n";
import { ImportanceBadge, StatusBadge } from "@/components/ep/ui-bits";

export const Route = createFileRoute("/_authenticated/report/$eventId")({
  head: () => ({
    meta: [
      { title: "Readiness report — EventProof" },
      { name: "description", content: "Printable final readiness report for the event." },
      { property: "og:title", content: "Readiness report — EventProof" },
      { property: "og:description", content: "Printable final readiness report for the event." },
    ],
  }),
  component: Report,
});

function Report() {
  const { eventId } = Route.useParams();
  const { t, lang } = useI18n();
  const { data, isLoading, error } = useQuery(eventQuery(eventId));
  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-success" />;
  if (error || !data) return <p className="text-destructive">{t("error")}</p>;
  const { event, tasks, criteria, evidence } = data;
  const pct = readiness(criteria);
  const counts = countByStatus(criteria);
  const missing = criteria.filter((c) => c.status !== "verified");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-6 flex justify-between">
        <Button asChild variant="ghost"><Link to="/events/$eventId" params={{ eventId }}><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t("back")}</Link></Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" />{t("printPdf")}</Button>
      </div>
      <article className="space-y-8 rounded-2xl border bg-card p-8 shadow-card print:border-0 print:p-0 print:shadow-none">
        <header className="border-b pb-6">
          <div className="text-sm font-semibold text-success">{t("appName")} · {t("report")}</div>
          <h1 className="mt-1 text-3xl font-bold">{event.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {[event.event_type, event.location, event.event_date, event.visitors != null ? `${event.visitors} ${t("visitors")}` : null, event.organizer].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("generatedOn")}: {new Date().toLocaleString(lang === "ar" ? "ar" : "en")}</p>
        </header>

        <section className="flex flex-wrap items-center gap-8">
          <div><div className="font-display text-5xl font-bold text-success">{pct}%</div><div className="text-sm text-muted-foreground">{t("readiness")}</div></div>
          {(["verified", "pending", "rejected", "manual_review"] as const).map((k) => (
            <div key={k}><div className="text-2xl font-bold">{counts[k]}</div><div className="text-xs text-muted-foreground">{t(k)}</div></div>
          ))}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">{t("missing")} ({missing.length})</h2>
          <ul className="space-y-1 text-sm">
            {missing.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 border-b py-1"><span>{c.title}{c.mandatory && <span className="ms-2 text-xs text-destructive">({t("mandatory")})</span>}</span><StatusBadge status={c.status} /></li>)}
          </ul>
        </section>

        {tasks.map((task, i) => {
          const crits = criteria.filter((c) => c.task_id === task.id);
          return (
            <section key={task.id} className="break-inside-avoid-page">
              <h2 className="mb-1 text-lg font-bold">{i + 1}. {task.title} <span className="text-sm font-normal text-muted-foreground">— {readiness(crits)}%</span></h2>
              {task.source_ref && <p className="mb-2 text-xs text-muted-foreground">{t("source")}: {task.source_ref}</p>}
              <div className="space-y-3">
                {crits.map((c) => {
                  const evs = evidence.filter((e) => e.criterion_id === c.id);
                  return (
                    <div key={c.id} className="break-inside-avoid rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.title}</span>
                        <ImportanceBadge importance={c.importance} />
                        <span className="text-xs text-muted-foreground">{c.mandatory ? t("mandatory") : t("optional")} · {t("weight")} {c.weight}</span>
                        <span className="ms-auto"><StatusBadge status={c.status} /></span>
                      </div>
                      {c.source_ref && <p className="mt-1 text-xs text-muted-foreground">{t("source")}: {c.source_ref}</p>}
                      {evs.length > 0 && (
                        <ul className="mt-2 space-y-1.5 text-xs">
                          {evs.map((e) => (
                            <li key={e.id} className="rounded bg-muted p-2">
                              <div className="flex items-center justify-between gap-2"><span className="font-medium">{e.file_name}</span><StatusBadge status={e.final_status} /></div>
                              {e.ai_explanation && <div className="mt-1">{t("aiDecision")}: {e.ai_explanation}{e.ai_confidence != null && ` (${t("confidence")} ${Math.round(Number(e.ai_confidence) * 100)}%)`}</div>}
                              {e.override_reason && <div className="mt-1">{t("overriddenBy")}: {e.override_reason}</div>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </article>
    </div>
  );
}
