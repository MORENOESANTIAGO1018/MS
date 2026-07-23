/**
 * Tentativas automaticas com backoff exponencial, com tratamento especifico
 * de rate limit (HTTP 429) do Notion — a API do Notion retorna
 * `Retry-After` em segundos quando limitada.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRateLimited =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status?: number }).status === 429;

      if (attempt === maxAttempts) break;

      const delay = isRateLimited ? baseDelayMs * attempt * 4 : baseDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
