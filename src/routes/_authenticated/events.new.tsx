import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, Sparkles, Type, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraftEditor } from "@/components/ep/DraftEditor";
import { analyzeRequirements, type DraftTask } from "@/lib/ai.functions";
import { extractText, fileToBase64, kindOf } from "@/lib/extract";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({
    meta: [
      { title: "New event — EventProof" },
      { name: "description", content: "Create an event and analyze its requirements with AI." },
      { property: "og:title", content: "New event — EventProof" },
      { property: "og:description", content: "Create an event and analyze its requirements with AI." },
    ],
  }),
  component: NewEvent,
});

function NewEvent() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeRequirements);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", event_type: "", location: "", event_date: "", visitors: "", organizer: "", description: "" });
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [reqText, setReqText] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function runAnalysis() {
    setBusy(true);
    try {
      let payload: Parameters<typeof analyze>[0]["data"];
      if (mode === "upload") {
        if (!file) throw new Error(t("needRequirements"));
        const k = kindOf(file);
        if (k === "pdf") {
          payload = { pdfBase64: await fileToBase64(file), filename: file.name, lang };
          setReqText(`[${file.name}]`);
        } else if (k === "docx" || k === "txt") {
          const txt = (await extractText(file)) ?? "";
          if (!txt.trim()) throw new Error(t("needRequirements"));
          payload = { text: txt, filename: file.name, lang };
          setReqText(txt);
        } else throw new Error(t("uploadHint"));
      } else {
        if (!text.trim()) throw new Error(t("needRequirements"));
        payload = { text, lang };
        setReqText(text);
      }
      const res = await analyze({ data: payload });
      if (!res.tasks.length) toast.warning(t("noRequirements"));
      setTasks(res.tasks);
      setStep(3);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const { data: ev, error } = await supabase
        .from("events")
        .insert({
          name: form.name,
          event_type: form.event_type,
          location: form.location,
          event_date: form.event_date || null,
          visitors: form.visitors ? Number(form.visitors) : null,
          organizer: form.organizer,
          description: form.description,
          requirements_text: reqText,
          source_filename: mode === "upload" ? file?.name ?? null : null,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      for (const [i, task] of tasks.entries()) {
        if (!task.title.trim()) continue;
        const { data: tr, error: te } = await supabase
          .from("tasks")
          .insert({ event_id: ev.id, title: task.title, description: task.description, source_ref: task.source_ref, position: i })
          .select()
          .single();
        if (te) throw te;
        const rows = task.criteria
          .filter((c) => c.title.trim())
          .map((c, k) => ({ ...c, weight: Math.max(0, Number(c.weight) || 0), task_id: tr.id, event_id: ev.id, position: k }));
        if (rows.length) {
          const { error: ce } = await supabase.from("criteria").insert(rows);
          if (ce) throw ce;
        }
      }
      await qc.invalidateQueries({ queryKey: ["events"] });
      nav({ to: "/events/$eventId", params: { eventId: ev.id } });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-3xl font-bold">{t("newEvent")}</h1>
      <ol className="mb-8 flex gap-2">
        {steps.map((s, i) => (
          <li key={s} className={cn("flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm", step === i + 1 ? "border-success bg-accent text-accent-foreground" : step > i + 1 ? "border-success/40 text-success" : "text-muted-foreground")}>
            <span className="font-bold">{i + 1}</span>{s}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <form
          className="grid gap-4 rounded-2xl border bg-card p-6 shadow-card md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return toast.error(t("needName"));
            setStep(2);
          }}
        >
          <div className="space-y-1.5 md:col-span-2"><Label>{t("eventName")} *</Label><Input required value={form.name} onChange={set("name")} /></div>
          <div className="space-y-1.5"><Label>{t("eventType")}</Label><Input value={form.event_type} onChange={set("event_type")} /></div>
          <div className="space-y-1.5"><Label>{t("location")}</Label><Input value={form.location} onChange={set("location")} /></div>
          <div className="space-y-1.5"><Label>{t("date")}</Label><Input type="date" value={form.event_date} onChange={set("event_date")} /></div>
          <div className="space-y-1.5"><Label>{t("visitors")}</Label><Input type="number" min={0} value={form.visitors} onChange={set("visitors")} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>{t("organizer")}</Label><Input value={form.organizer} onChange={set("organizer")} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>{t("description")}</Label><Textarea rows={3} value={form.description} onChange={set("description")} /></div>
          <div className="md:col-span-2 flex justify-end"><Button type="submit">{t("next")}</Button></div>
        </form>
      )}

      {step === 2 && (
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "upload" | "paste")}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="upload"><FileUp className="h-4 w-4" />{t("uploadDoc")}</TabsTrigger>
              <TabsTrigger value="paste"><Type className="h-4 w-4" />{t("pasteText")}</TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center hover:border-success hover:bg-accent/40">
                {file ? <FileText className="h-10 w-10 text-success" /> : <FileUp className="h-10 w-10 text-muted-foreground" />}
                <span className="font-medium">{file ? file.name : t("chooseFile")}</span>
                <span className="text-sm text-muted-foreground">{t("uploadHint")}</span>
                <input type="file" className="hidden" accept=".pdf,.docx,.txt,application/pdf,text/plain" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </TabsContent>
            <TabsContent value="paste">
              <Textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("pasteHint")} />
            </TabsContent>
          </Tabs>
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>{t("back")}</Button>
            <Button onClick={runAnalysis} disabled={busy} className="bg-success text-success-foreground hover:bg-success/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? t("analyzing") : t("analyze")}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="mb-5 rounded-xl bg-accent p-4 text-accent-foreground">
            <h2 className="font-semibold">{t("reviewTitle")}</h2>
            <p className="text-sm">{t("reviewBody")}</p>
          </div>
          <DraftEditor tasks={tasks} onChange={setTasks} />
          <div className="sticky bottom-0 mt-6 flex justify-between border-t bg-background/95 py-4 backdrop-blur">
            <Button variant="outline" onClick={() => setStep(2)}>{t("back")}</Button>
            <Button onClick={save} disabled={busy || tasks.length === 0}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? t("saving") : t("confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
