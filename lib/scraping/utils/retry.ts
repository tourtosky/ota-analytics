interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * Error that should not be retried (e.g. bot protection, auth failures).
 * Throw this to bypass retry logic and fail immediately.
 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

/**
 * Retry an async function with exponential backoff.
 * Delays: attempt 1 = 0s, attempt 2 = baseDelayMs, attempt 3 = baseDelayMs * 3
 *
 * Throws immediately (no retry) if fn throws a NonRetryableError.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 3000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = baseDelayMs * Math.pow(3, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry errors that won't resolve with another attempt
      if (err instanceof NonRetryableError) {
        console.warn(`[scraper] Non-retryable error:`, err.message);
        throw err;
      }

      console.warn(
        `[scraper] Attempt ${attempt + 1}/${maxAttempts} failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  throw lastError;
}
