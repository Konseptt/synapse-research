/**
 * Run work after the response is sent.
 * Uses Next.js `after()` on Vercel/serverless; falls back to fire-and-forget locally.
 */
export async function runBackground(task: () => Promise<void>): Promise<void> {
  if (process.env.VERCEL) {
    const { after } = await import("next/server");
    after(task);
    return;
  }

  void task().catch(console.error);
}

/** Only use BullMQ when a worker process is explicitly enabled. */
export function shouldUseQueue(): boolean {
  return process.env.USE_WORKER === "true" && Boolean(process.env.REDIS_URL);
}
