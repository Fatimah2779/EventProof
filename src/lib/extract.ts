// Browser-side file reading helpers.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function kindOf(file: File): "pdf" | "docx" | "txt" | "image" | "other" {
  const n = file.name.toLowerCase();
  if (file.type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (file.type.startsWith("text/") || n.endsWith(".txt") || n.endsWith(".md")) return "txt";
  if (file.type.startsWith("image/")) return "image";
  return "other";
}

export async function extractText(file: File): Promise<string | null> {
  const k = kindOf(file);
  if (k === "txt") return await file.text();
  if (k === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return res.value;
  }
  return null;
}
