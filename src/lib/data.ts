import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type CriterionRow = Database["public"]["Tables"]["criteria"]["Row"];
export type EvidenceRow = Database["public"]["Tables"]["evidence"]["Row"];

export const eventsQuery = () =>
  queryOptions({
    queryKey: ["events"],
    queryFn: async () => {
      const { data: events, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: crit } = await supabase.from("criteria").select("event_id,status,weight,mandatory");
      return { events: events ?? [], criteria: crit ?? [] };
    },
  });

export const eventQuery = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const [e, t, c, ev] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).single(),
        supabase.from("tasks").select("*").eq("event_id", id).order("position"),
        supabase.from("criteria").select("*").eq("event_id", id).order("position"),
        supabase.from("evidence").select("*").eq("event_id", id).order("created_at", { ascending: false }),
      ]);
      if (e.error) throw e.error;
      return { event: e.data, tasks: t.data ?? [], criteria: c.data ?? [], evidence: ev.data ?? [] };
    },
  });

export async function signedUrl(path: string) {
  const { data } = await supabase.storage.from("evidence").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
