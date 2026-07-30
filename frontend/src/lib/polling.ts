import { ApiError } from "@/lib/api";

type PollCallback = (signal: AbortSignal) => Promise<void>;

const MAX_BACKOFF_MS = 300_000;
const DEFAULT_RETRY_AFTER_MS = 60_000;

export function getPollingBackoffMs(
  error: unknown,
  intervalMs: number,
  consecutiveFailures: number,
): number {
  const retryAfterMs =
    error instanceof ApiError && error.status === 429
      ? (error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_MS / 1000) * 1000
      : intervalMs;
  const multiplier = Math.pow(2, Math.min(consecutiveFailures - 1, 8));

  return Math.min(
    Math.max(intervalMs, retryAfterMs) * multiplier,
    MAX_BACKOFF_MS,
  );
}

export function startPolling(
  callback: PollCallback,
  intervalMs: number,
  requestTimeoutMs = 15_000,
): () => void {
  let stopped = false;
  let inFlight = false;
  let rerunRequested = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let consecutiveFailures = 0;
  let backoffUntil = 0;

  const isPageVisible = (): boolean =>
    typeof document === "undefined" || document.visibilityState === "visible";

  const clearScheduledPoll = (): void => {
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  const scheduleNext = (delayMs: number): void => {
    clearScheduledPoll();
    if (stopped || !isPageVisible()) return;

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      void poll();
    }, delayMs);
  };

  const poll = async (): Promise<void> => {
    if (stopped || !isPageVisible()) return;

    const backoffRemainingMs = backoffUntil - Date.now();
    if (backoffRemainingMs > 0) {
      scheduleNext(backoffRemainingMs);
      return;
    }

    if (inFlight) {
      rerunRequested = true;
      return;
    }

    clearScheduledPoll();
    inFlight = true;
    const requestController = new AbortController();
    controller = requestController;
    let nextDelayMs = intervalMs;
    let didTimeout = false;
    const requestTimeoutId = setTimeout(
      () => {
        didTimeout = true;
        requestController.abort();
      },
      requestTimeoutMs,
    );

    try {
      await callback(requestController.signal);
      consecutiveFailures = 0;
      backoffUntil = 0;
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";

      if (!isAbortError || didTimeout) {
        consecutiveFailures++;
        nextDelayMs = getPollingBackoffMs(
          error,
          intervalMs,
          consecutiveFailures,
        );
        backoffUntil = Date.now() + nextDelayMs;
      }
    } finally {
      clearTimeout(requestTimeoutId);
      inFlight = false;
      if (controller === requestController) {
        controller = undefined;
      }

      if (stopped || !isPageVisible()) return;

      const remainingMs = backoffUntil - Date.now();
      if (rerunRequested && remainingMs <= 0) {
        rerunRequested = false;
        void poll();
      } else {
        rerunRequested = false;
        scheduleNext(Math.max(remainingMs, nextDelayMs));
      }
    }
  };

  const handleVisibilityChange = (): void => {
    if (!isPageVisible()) {
      clearScheduledPoll();
      controller?.abort();
      return;
    }

    void poll();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  void poll();

  return () => {
    stopped = true;
    clearScheduledPoll();
    controller?.abort();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
