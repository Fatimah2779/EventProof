import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { DraftTask, DraftCriterion } from "@/lib/ai.functions";
import { useI18n } from "@/lib/i18n";

const emptyCrit = (): DraftCriterion => ({ title: "", description: "", importance: "medium", mandatory: true, weight: 3, source_ref: "" });

export function DraftEditor({ tasks, onChange }: { tasks: DraftTask[]; onChange: (t: DraftTask[]) => void }) {
  const { t } = useI18n();
  const setTask = (i: number, patch: Partial<DraftTask>) => onChange(tasks.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setCrit = (i: number, k: number, patch: Partial<DraftCriterion>) =>
    setTask(i, { criteria: tasks[i].criteria.map((c, j) => (j === k ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-5">
      {tasks.map((task, i) => (
        <div key={i} className="rounded-2xl border-2 border-primary/15 bg-card p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-navy-foreground">{i + 1}</span>
            <div className="flex-1 space-y-2">
              <Input className="text-base font-semibold" value={task.title} placeholder={t("title")} onChange={(e) => setTask(i, { title: e.target.value })} />
              <Textarea rows={2} value={task.description} placeholder={t("description")} onChange={(e) => setTask(i, { description: e.target.value })} />
              <Input className="text-xs" value={task.source_ref} placeholder={t("source")} onChange={(e) => setTask(i, { source_ref: e.target.value })} />
            </div>
            <Button variant="ghost" size="icon" aria-label={t("remove")} onClick={() => onChange(tasks.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="mt-4 grid gap-3 border-s-2 border-success/40 ps-4 md:ms-10 md:grid-cols-2">
            {task.criteria.map((c, k) => (
              <div key={k} className="space-y-2 rounded-xl border bg-muted/40 p-3">
                <div className="flex gap-2">
                  <Input value={c.title} placeholder={t("title")} onChange={(e) => setCrit(i, k, { title: e.target.value })} />
                  <Button variant="ghost" size="icon" aria-label={t("remove")} onClick={() => setTask(i, { criteria: task.criteria.filter((_, j) => j !== k) })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea rows={2} value={c.description} placeholder={t("description")} onChange={(e) => setCrit(i, k, { description: e.target.value })} />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select className="h-8 rounded-md border bg-card px-2" value={c.importance} onChange={(e) => setCrit(i, k, { importance: e.target.value as DraftCriterion["importance"] })}>
                    {(["critical", "high", "medium", "low"] as const).map((v) => <option key={v} value={v}>{t(v)}</option>)}
                  </select>
                  <label className="flex items-center gap-1">{t("weight")}
                    <Input type="number" min={0} max={100} className="h-8 w-16" value={c.weight} onChange={(e) => setCrit(i, k, { weight: Number(e.target.value) })} />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <Switch checked={c.mandatory} onCheckedChange={(v) => setCrit(i, k, { mandatory: v })} />
                    {c.mandatory ? t("mandatory") : t("optional")}
                  </label>
                </div>
                <Input className="h-8 text-xs" value={c.source_ref} placeholder={t("source")} onChange={(e) => setCrit(i, k, { source_ref: e.target.value })} />
              </div>
            ))}
            <Button variant="outline" size="sm" className="self-start" onClick={() => setTask(i, { criteria: [...task.criteria, emptyCrit()] })}>
              <Plus className="h-4 w-4" />{t("addCriterion")}
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={() => onChange([...tasks, { title: "", description: "", source_ref: "", criteria: [emptyCrit()] }])}>
        <Plus className="h-4 w-4" />{t("addTask")}
      </Button>
    </div>
  );
}
