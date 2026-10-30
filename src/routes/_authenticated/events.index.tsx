import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, MapPin, Calendar, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventsQuery } from "@/lib/data";
import { readiness } from "@/lib/readiness";
import { useI18n } from "@/lib/i18n";
import { Bar } from "@/components/ep/ui-bits";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({
    meta: [
      { title: "My events — EventProof" },
      { name: "description", content: "All your events and their readiness at a glance." },
      { property: "og:title", content: "My events — EventProof" },
      { property: "og:description", content: "All your events and their readiness at a glance." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { t } = useI18n();
  const { data, isLoading, error } = useQuery(eventsQuery());
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("myEvents")}</h1>
        <Button asChild className="bg-success text-success-foreground hover:bg-success/90">
          <Link to="/events/new"><Plus className="h-4 w-4" />{t("newEvent")}</Link>
        </Button>
      </div>
      {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-success" />}
      {error && <p className="text-destructive">{t("error")}: {(error as Error).message}</p>}
      {data && data.events.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">{t("noEvents")}</div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.events.map((e) => {
          const crit = data.criteria.filter((c) => c.event_id === e.id);
          const pct = readiness(crit);
          return (
            <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="group rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-success/50">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-success">{e.event_type}</div>
              <h3 className="text-lg font-semibold group-hover:text-primary">{e.name}</h3>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {e.location && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{e.location}</div>}
                {e.event_date && <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{e.event_date}</div>}
                {e.visitors != null && <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{e.visitors.toLocaleString()}</div>}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Bar value={pct} />
                <span className="text-sm font-semibold tabular-nums">{pct}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
