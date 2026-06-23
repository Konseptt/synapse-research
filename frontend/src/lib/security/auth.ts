import { jwtVerify } from "jose";

import { config } from "@/lib/config";

const DEFAULT_JWT_SECRET = "change-me-in-production";

if (process.env.NODE_ENV === "production" && config.jwtSecret === DEFAULT_JWT_SECRET) {
  console.error(
    "[synapse] JWT_SECRET is still the default in production. Set a strong secret before enabling AUTH_ENABLED.",
  );
}

export async function requireAuth(request: Request): Promise<Response | null> {
  if (!config.authEnabled) return null;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(config.jwtSecret);
    await jwtVerify(token, secret);
    return null;
  } catch {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export function validatePdfUpload(
  file: File,
): { valid: true } | { valid: false; error: string } {
  const maxBytes = config.pdfMaxSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `PDF must be under ${config.pdfMaxSizeMb} MB. Choose a smaller file.`,
    };
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { valid: false, error: "Only PDF files are accepted." };
  }

  return { valid: true };
}