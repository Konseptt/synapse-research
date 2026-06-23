import { config } from "@/lib/config";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are not configured on this server.");
    this.name = "AiNotConfiguredError";
  }
}

export class PubMedUnavailableError extends Error {
  constructor(message = "PubMed is temporarily unavailable.") {
    super(message);
    this.name = "PubMedUnavailableError";
  }
}

export const AI_UNAVAILABLE_MESSAGE =
  "AI summarization is not available on this server yet. The site admin needs to add an NVIDIA API key.";

export function isAiConfigured(): boolean {
  return Boolean(config.nvidiaApiKey?.trim());
}

export function assertAiConfigured(): void {
  if (!isAiConfigured()) throw new AiNotConfiguredError();
}

export function aiErrorStatus(error: unknown): { message: string; status: number } | null {
  if (error instanceof AiNotConfiguredError) {
    return { message: AI_UNAVAILABLE_MESSAGE, status: 503 };
  }
  if (error instanceof PubMedUnavailableError) {
    return {
      message: "PubMed is temporarily unavailable. Try again in a moment.",
      status: 503,
    };
  }
  return null;
}
