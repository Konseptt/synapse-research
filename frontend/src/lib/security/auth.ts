import { config } from "@/lib/config";

export function requireAuth(request: Request): Response | null {
  if (!config.authEnabled) return null;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export function validatePdfUpload(
  file: File,
): { valid: true } | { valid: false; error: string } {
  const maxBytes = config.pdfMaxSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    return { valid: false, error: `PDF exceeds ${config.pdfMaxSizeMb}MB limit` };
  }

  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    return { valid: false, error: "Only PDF files are accepted" };
  }

  return { valid: true };
}
