type PollCallback = (signal: AbortSignal) => Promise<void>;

export function startPolling(
  callback: PollCallback,
  intervalMs: number,
  requestTimeoutMs = 15_000,
): () => void {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const poll = async (): Promise<void> => {
    controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller?.abort(),
      requestTimeoutMs,
    );

    try {
      await callback(controller.signal);
    } catch {
    } finally {
      clearTimeout(requestTimeoutId);
      controller = undefined;
      if (!stopped) {
        timeoutId = setTimeout(() => void poll(), intervalMs);
      }
    }
  };

  void poll();

  return () => {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
    controller?.abort();
  };
}
