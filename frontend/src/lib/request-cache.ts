type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export async function getCachedRequest<T>(
  key: string,
  loader: () => Promise<T>,
  staleMs: number,
): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value as T;
  }

  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const request = loader();
  inFlightRequests.set(key, request);

  try {
    const value = await request;
    cache.set(key, {
      value,
      expiresAt: Date.now() + staleMs,
    });
    return value;
  } finally {
    inFlightRequests.delete(key);
  }
}

export function invalidateRequestCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
