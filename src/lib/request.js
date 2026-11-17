export class RequestError extends Error {
  constructor(code, status = 0) {
    super(
      code === 'timeout' ? 'The request timed out.' : 'Weather service is temporarily unavailable.',
    );
    this.name = 'RequestError';
    this.code = code;
    this.status = status;
  }
}

// Bounded retries for transient GET failures; never retry a quota or validation error.
export async function fetchJson(url, { signal, timeoutMs = 10000, retries = 1, ...options } = {}) {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok)
        throw new RequestError(response.status === 429 ? 'rate_limited' : 'http', response.status);
      try {
        return await response.json();
      } catch {
        throw new RequestError('invalid_response');
      }
    } catch (cause) {
      if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
      const error = timedOut ? new RequestError('timeout') : cause;
      const transient =
        timedOut || cause instanceof TypeError || [502, 503, 504].includes(cause.status);
      if (attempt >= retries || !transient) throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
    // No sleep is needed on cancellation; the next attempt checks the signal first.
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
}
