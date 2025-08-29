// lib/retry.ts
export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; shouldRetry?: (e: any) => boolean } = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 500;
  const shouldRetry = opts.shouldRetry ?? ((e) => {
    const code = e?.status || e?.response?.status;
    return code === 429 || (code >= 500 && code < 600);
  });
  let attempt = 0, lastErr: any;
  while (attempt <= retries) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (attempt === retries || !shouldRetry(e)) break;
      const backoff = baseMs * (1 << attempt) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }
  throw lastErr;
}
