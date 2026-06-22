export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number; retries?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 30_000;
  const retries = init?.retries ?? 1;
  const { timeoutMs: _timeoutMs, retries: _retries, ...fetchInit } = init ?? {};
  void _timeoutMs;
  void _retries;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(path, { ...fetchInit, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        const message = (err as { error?: string }).error ?? "Request failed";
        const retryable = res.status >= 500 || res.status === 429;
        throw new ApiError(message, res.status, retryable);
      }

      return (await res.json()) as T;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof ApiError) {
        lastError = error;
        if (!error.retryable || attempt >= retries) throw error;
      } else if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ApiError("Request timed out", 408, true);
        if (attempt >= retries) throw lastError;
      } else {
        lastError = error instanceof Error ? error : new Error("Request failed");
        if (attempt >= retries) throw lastError;
      }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Request failed");
}
