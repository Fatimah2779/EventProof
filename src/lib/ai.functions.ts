import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callJson } from "./ai.server";

export interface DraftCriterion {
  title: string;
  description: string;
  importance: "critical" | "high" | "medium" | "low";
  mandatory: boolean;
  weight: number;
  source_ref: string;
}
export interface DraftTask {
  title: string;
  description: string;
  source_ref: string;
  criteria: DraftCriterion[];
}

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tasks"],
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "source_ref", "criteria"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          source_ref: { type: "string" },
          criteria: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "description", "importance", "mandatory", "weight", "source_ref"],
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                importance: { type: "string", enum: ["critical", "high", "medium", "low"] },
                mandatory: { type: "boolean" },
                weight: { type: "number" },
                source_ref: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export const analyzeRequirements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        text: z.string().max(400_000).optional(),
        pdfBase64: z.string().max(30_000_000).optional(),
        filename: z.string().max(300).optional(),
        lang: z.enum(["en", "ar"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.text?.trim() && !data.pdfBase64) throw new Error("No requirements content provided.");
    const content: Parameters<typeof callJson>[0]["content"] = [];
    if (data.pdfBase64)
      content.push({
        type: "input_file",
        filename: data.filename || "requirements.pdf",
        file_data: `data:application/pdf;base64,${data.pdfBase64}`,
      });
    if (data.text?.trim())
      content.push({ type: "input_text", text: `REQUIREMENTS CONTENT:\n"""\n${data.text}\n"""` });
    content.push({
      type: "input_text",
      text: `Write titles and descriptions in ${data.lang === "ar" ? "Arabic" : "English"}. Return JSON.`,
    });

    const out = await callJson<{ tasks: DraftTask[] }>({
      schemaName: "requirements_analysis",
      schema: analysisSchema,
      system: `You are an event compliance analyst. Extract every requirement from the provided content ONLY.
Rules:
- Never invent requirements or add information that is not in the content. If there are no requirements, return an empty tasks array.
- Group requirements into main tasks; split each into small, measurable, verifiable subcriteria with short clear titles.
- mandatory = true when the text uses obligatory language (must, shall, required, يجب, إلزامي) or it is a legal/safety requirement stated in the text; otherwise false.
- importance: critical (safety/legal/blocking), high, medium, low.
- weight: suggested integer 1-10 reflecting importance (critical 8-10, high 5-7, medium 3-4, low 1-2).
- source_ref: cite where it came from, e.g. "Page 3, Section 2.1" or "Section: Fire Safety" or a short quote if no numbering exists.`,
      content,
    });
    return out;
  });

const verifySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "explanation", "confidence"],
  properties: {
    status: { type: "string", enum: ["verified", "rejected", "manual_review"] },
    explanation: { type: "string" },
    confidence: { type: "number" },
  },
};

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export const verifyEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ evidenceId: z.string().uuid(), lang: z.enum(["en", "ar"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: ev, error } = await sb.from("evidence").select("*").eq("id", data.evidenceId).single();
    if (error || !ev) throw new Error("Evidence not found.");
    const { data: crit } = await sb.from("criteria").select("*").eq("id", ev.criterion_id).single();
    if (!crit) throw new Error("Criterion not found.");
    const { data: task } = await sb.from("tasks").select("*").eq("id", crit.task_id).single();

    const content: Parameters<typeof callJson>[0]["content"] = [
      {
        type: "input_text",
        text: `MAIN TASK: ${task?.title ?? ""}\n${task?.description ?? ""}\n\nSUBCRITERION: ${crit.title}\n${crit.description}\nSource of original requirement: ${crit.source_ref}\n\nEvidence file name: ${ev.file_name}`,
      },
    ];
    const mime = ev.mime_type || "";
    if (mime.startsWith("image/") || mime === "application/pdf") {
      const { data: file, error: dlErr } = await sb.storage.from("evidence").download(ev.file_path);
      if (dlErr || !file) throw new Error("Could not read the evidence file.");
      const b64 = toBase64(await file.arrayBuffer());
      if (mime.startsWith("image/"))
        content.push({ type: "input_image", image_url: `data:${mime};base64,${b64}`, detail: "auto" });
      else content.push({ type: "input_file", filename: ev.file_name, file_data: `data:${mime};base64,${b64}` });
    } else if (ev.extracted_text) {
      content.push({ type: "input_text", text: `EVIDENCE DOCUMENT TEXT:\n"""\n${ev.extracted_text.slice(0, 200_000)}\n"""` });
    } else {
      content.push({ type: "input_text", text: "The evidence file content could not be read automatically." });
    }
    content.push({
      type: "input_text",
      text: `Write the explanation in ${data.lang === "ar" ? "Arabic" : "English"}, 1-3 sentences. Return JSON.`,
    });

    const result = await callJson<{ status: "verified" | "rejected" | "manual_review"; explanation: string; confidence: number }>({
      schemaName: "evidence_verification",
      schema: verifySchema,
      system: `You verify event-readiness evidence against one specific subcriterion.
- "verified": only when the evidence clearly and sufficiently satisfies the subcriterion. Never verify without sufficient evidence.
- "rejected": the evidence is unrelated, insufficient, or contradicts the requirement. Explain exactly what is missing or incorrect.
- "manual_review": the evidence is plausibly relevant but cannot be reliably confirmed automatically (unreadable, ambiguous, requires physical inspection or authenticity checks).
- confidence: number from 0 to 1.`,
      content,
    });
    const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));
    // Low-confidence "verified" decisions are downgraded to manual review.
    const status = result.status === "verified" && confidence < 0.6 ? "manual_review" : result.status;

    await sb
      .from("evidence")
      .update({ ai_status: status, ai_explanation: result.explanation, ai_confidence: confidence, final_status: status, override_reason: null, overridden_at: null })
      .eq("id", ev.id);
    await sb.from("criteria").update({ status }).eq("id", crit.id);
    return { status, explanation: result.explanation, confidence };
  });
