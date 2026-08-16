import CircuitBreaker from "opossum";

const defaultOptions = {
  timeout: 10000, // If function takes longer than 10 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the breaker
  resetTimeout: 30000 // After 30 seconds, try again
};

/**
 * Wraps an async function with an opossum Circuit Breaker.
 */
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options?: Partial<typeof defaultOptions>
): CircuitBreaker<Parameters<T>, ReturnType<T>> {
  const breaker = new CircuitBreaker(action, { ...defaultOptions, ...options });
  
  breaker.fallback(() => {
    return Promise.resolve({ error: "Service currently unavailable (Circuit Breaker tripped). Fallback triggered." });
  });

  breaker.on("open", () => console.warn(`[CircuitBreaker] Opened for ${action.name}`));
  breaker.on("halfOpen", () => console.info(`[CircuitBreaker] Half-Open for ${action.name}`));
  breaker.on("close", () => console.info(`[CircuitBreaker] Closed for ${action.name}`));

  return breaker as any;
}

/**
 * Simple Exponential Backoff Retry logic
 */
export async function withRetry<T>(
  action: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await action();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      const backoff = delayMs * Math.pow(2, attempt - 1);
      console.warn(`[Retry] Attempt ${attempt} failed, retrying in ${backoff}ms...`);
      await new Promise(res => setTimeout(res, backoff));
    }
  }
  throw new Error("Retry failed");
}
