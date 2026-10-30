import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, ImageIcon, Loader2, RefreshCw, Upload, Gavel } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { verifyEvidence } from "@/lib/ai.functions";
import { extractText, kindOf } from "@/lib/extract";
import { signedUrl, type CriterionRow, type EvidenceRow } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ImportanceBadge, StatusBadge } from "./ui-bits";

function Preview({ ev }: { ev: EvidenceRow }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    signedUrl(ev.file_path).then(setUrl);
  }, [ev.file_path]);
  const isImg = ev.mime_type.startsWith("image/");
  return (
    <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
      {isImg && url ? <img src={url} alt={ev.file_name} className="h-full w-full object-cover" /> : (
        <div className="flex h-full items-center justify-center">{isImg ? <ImageIcon className="h-8 w-8 text-muted-foreground" /> : <FileText className="h-8 w-8 text-muted-foreground" />}</div>
      )}
    </a>
  );
}

export function CriterionSheet({ criterion, evidence, eventId, onClose }: { criterion: CriterionRow | null; evidence: EvidenceRow[]; eventId: string; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const verify = useServerFn(verifyEvidence);
  const [busy, setBusy] = useState<string | null>(null);
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const [ovStatus, setOvStatus] = useState("verified");
  const [ovReason, setOvReason] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["event", eventId] });

  async function runVerify(id: string) {
    setBusy(id);
    try {
      const r = await verify({ data: { evidenceId: id, lang } });
      toast.message(`${t("aiDecision")}: ${t(r.status)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      refresh();
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !criterion || !user) return;
    setBusy("upload");
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: > 20 MB`);
        const path = `${user.id}/${eventId}/${criterion.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("evidence").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const k = kindOf(file);
        const extracted = k === "docx" || k === "txt" ? await extractText(file) : null;
        const { data: ev, error } = await supabase
          .from("evidence")
          .insert({ criterion_id: criterion.id, event_id: eventId, file_path: path, file_name: file.name, mime_type: file.type || (k === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ""), extracted_text: extracted })
          .select()
          .single();
        if (error) throw error;
        await refresh();
        await runVerify(ev.id);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      refresh();
    }
  }

  async function saveOverride(ev: EvidenceRow) {
    if (!ovReason.trim()) return toast.error(t("reasonRequired"));
    await supabase.from("evidence").update({ final_status: ovStatus, override_reason: ovReason, overridden_at: new Date().toISOString() }).eq("id", ev.id);
    if (criterion && evidence[0]?.id === ev.id) await supabase.from("criteria").update({ status: ovStatus }).eq("id", criterion.id);
    setOverrideFor(null);
    setOvReason("");
    refresh();
  }

  const latestRejected = evidence[0]?.final_status === "rejected";

  return (
    <Sheet open={!!criterion} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={lang === "ar" ? "left" : "right"} className="w-full overflow-y-auto sm:max-w-lg">
        {criterion && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <ImportanceBadge importance={criterion.importance} />
                <span className="text-xs text-muted-foreground">{criterion.mandatory ? t("mandatory") : t("optional")} · {t("weight")} {criterion.weight}</span>
                <StatusBadge status={criterion.status} />
              </div>
              <SheetTitle className="text-start">{criterion.title}</SheetTitle>
              <SheetDescription className="text-start">{criterion.description}</SheetDescription>
              {criterion.source_ref && <p className="text-start text-xs text-muted-foreground">{t("source")}: {criterion.source_ref}</p>}
            </SheetHeader>

            <div className="mt-6 px-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm font-medium hover:border-success hover:bg-accent/40">
                {busy === "upload" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-success" />}
                {busy === "upload" ? t("uploading") : evidence.length ? (latestRejected ? t("addMore") : t("addMore")) : t("uploadEvidence")}
                <input type="file" multiple className="hidden" disabled={!!busy} accept="image/*,.pdf,.docx,.txt" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
              </label>

              <h3 className="mb-3 mt-8 font-semibold">{t("history")}</h3>
              {evidence.length === 0 && <p className="text-sm text-muted-foreground">{t("noEvidence")}</p>}
              <div className="space-y-3">
                {evidence.map((ev) => (
                  <div key={ev.id} className="rounded-xl border bg-card p-3">
                    <div className="flex gap-3">
                      <Preview ev={ev} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{ev.file_name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString(lang === "ar" ? "ar" : "en")}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {busy === ev.id ? <span className="flex items-center gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" />{t("verifying")}</span> : <StatusBadge status={ev.final_status} />}
                          {ev.ai_confidence != null && <span className="text-xs text-muted-foreground">{t("confidence")} {Math.round(Number(ev.ai_confidence) * 100)}%</span>}
                        </div>
                      </div>
                    </div>
                    {ev.ai_explanation && <p className="mt-2 rounded-md bg-muted p-2 text-xs"><b>{t("aiDecision")}:</b> {ev.ai_status && t(ev.ai_status as "verified")} — {ev.ai_explanation}</p>}
                    {ev.override_reason && <p className="mt-2 rounded-md bg-accent p-2 text-xs text-accent-foreground"><b>{t("overriddenBy")}:</b> {ev.override_reason}</p>}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => runVerify(ev.id)}><RefreshCw className="h-3.5 w-3.5" />{t("verifyAgain")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setOverrideFor(ev.id); setOvStatus(ev.final_status === "verified" ? "rejected" : "verified"); }}><Gavel className="h-3.5 w-3.5" />{t("override")}</Button>
                    </div>
                    {overrideFor === ev.id && (
                      <div className="mt-2 space-y-2 rounded-lg border p-3">
                        <div className="text-sm font-medium">{t("overrideTitle")}</div>
                        <select className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={ovStatus} onChange={(e) => setOvStatus(e.target.value)}>
                          {(["verified", "rejected", "manual_review", "pending"] as const).map((s) => <option key={s} value={s}>{t(s)}</option>)}
                        </select>
                        <Textarea rows={2} placeholder={t("reason")} value={ovReason} onChange={(e) => setOvReason(e.target.value)} />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setOverrideFor(null)}>{t("cancel")}</Button>
                          <Button size="sm" onClick={() => saveOverride(ev)}>{t("save")}</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
