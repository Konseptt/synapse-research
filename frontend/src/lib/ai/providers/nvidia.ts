import OpenAI from "openai";

import { TTL, cacheKey, turboGet, turboSet } from "@/lib/cache/turbo-cache";
import { config } from "@/lib/config";

let client: OpenAI | null = null;

export function getNvidiaClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: config.nvidiaBaseUrl,
      apiKey: config.nvidiaApiKey || "not-set",
    });
  }
  return client;
}

export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
): Promise<string> {
  const response = await getNvidiaClient().chat.completions.create({
    model: config.nvidiaModel,
    messages,
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.maxTokens ?? 4096,
    ...(options?.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from NVIDIA API");
  return content;
}

/** NVIDIA asymmetric embed models (e5, embedqa) need query vs passage mode. */
function resolveEmbeddingModel(inputType: "query" | "passage"): string {
  const base = config.nvidiaEmbeddingModel.replace(/-(query|passage)$/i, "");
  const needsInputType =
    base.includes("embedqa") || base.includes("e5-v") || base.includes("arctic-embed");

  if (!needsInputType) return config.nvidiaEmbeddingModel;

  // OpenAI-compatible NVIDIA API: append -query or -passage to model name.
  return `${base}-${inputType}`;
}

export async function embedText(
  text: string,
  options?: { inputType?: "query" | "passage"; retries?: number },
): Promise<number[]> {
  const inputType = options?.inputType ?? "passage";
  const trimmed = text.slice(0, 8000);
  const ek = cacheKey(["embed", inputType, trimmed.slice(0, 512)]);
  const cached = turboGet<number[]>(ek);
  if (cached) return cached;

  const retries = options?.retries ?? 2;
  const model = resolveEmbeddingModel(inputType);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await getNvidiaClient().embeddings.create({
        model,
        input: trimmed,
      });
      const embedding = response.data[0]?.embedding;
      if (!embedding?.length) throw new Error("Empty embedding from NVIDIA API");
      turboSet(ek, embedding, TTL.embedding);
      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Embedding failed");
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Embedding failed");
}
