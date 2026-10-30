import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";

type Content =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail?: "auto" }
  | { type: "input_file"; file_data: string; filename: string };

export async function callJson<T>(opts: {
  system: string;
  content: Content[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: opts.system,
      input: [{ role: "user", content: opts.content }],
      text: {
        format: { type: "json_schema", name: opts.schemaName, schema: opts.schema, strict: true },
      },
    });
    const r = res as unknown as {
      output_text?: string;
      output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
    };
    let text = r.output_text ?? "";
    if (!text) {
      for (const item of r.output ?? []) {
        if (item.type === "message")
          for (const c of item.content ?? []) if (c.type === "output_text") text += c.text ?? "";
      }
    }
    if (!text) throw new Error("The AI returned an empty response.");
    return JSON.parse(text) as T;
  } catch (e) {
    if (e instanceof GatewayError) {
      const status = (e as { httpStatus?: number }).httpStatus;
      if (status === 429) throw new Error("AI rate limit reached. Please wait a moment and try again.");
      if (status === 402) throw new Error("AI credits are exhausted. Please add credits to continue.");
      throw new Error(`AI service error: ${e.message}`);
    }
    throw e;
  }
}
