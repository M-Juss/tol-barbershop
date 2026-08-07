export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  errors: unknown;
  code: string | null;

  constructor(
    message: string,
    status: number,
    retryAfterSeconds: number | null = null,
    errors: unknown = null,
    code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.errors = errors;
    this.code = code;
  }
}

export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

const API_PREFIX = "/api/v1";
const CSRF_COOKIE_URL = "/sanctum/csrf-cookie";
const SAFE_URL_BASE = "https://same-origin.invalid";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const NETWORK_ERROR_MESSAGE =
  "We're having trouble connecting right now. Check your internet connection and try again in a few moments.";
const SERVER_ERROR_MESSAGE =
  "Something went wrong on our side. Please try again later.";
const GET_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 10_000;
const MAX_CONCURRENT_GETS = 2;

let csrfInitialization: Promise<void> | null = null;

const inFlightGetRequests = new Map<string, Promise<unknown>>();
const dedupConsumerCount = new Map<string, number>();

let activeGetCount = 0;
const waitingGetQueue: Array<{
  signal: AbortSignal | null | undefined;
  resolve: () => void;
  reject: (reason: unknown) => void;
  settled: boolean;
  handleAbort: () => void;
}> = [];

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

async function acquireGetSlot(
  signal: AbortSignal | null | undefined,
): Promise<void> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  if (activeGetCount < MAX_CONCURRENT_GETS) {
    activeGetCount++;
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const entry = {
      signal,
      resolve,
      reject,
      settled: false,
      handleAbort: () => {
        const index = waitingGetQueue.indexOf(entry);
        if (index >= 0) {
          waitingGetQueue.splice(index, 1);
        }
        if (!entry.settled) {
          entry.settled = true;
          entry.reject(createAbortError());
        }
      },
    };

    waitingGetQueue.push(entry);
    signal?.addEventListener("abort", entry.handleAbort, { once: true });
    if (signal?.aborted) {
      entry.handleAbort();
    }
  });
}

function releaseGetSlot(): void {
  activeGetCount = Math.max(0, activeGetCount - 1);

  while (waitingGetQueue.length > 0) {
    const entry = waitingGetQueue.shift()!;
    entry.signal?.removeEventListener("abort", entry.handleAbort);
    if (entry.settled) continue;
    if (entry.signal?.aborted) {
      entry.settled = true;
      entry.reject(createAbortError());
      continue;
    }
    activeGetCount++;
    entry.resolve();
    return;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }

  const retryDate = new Date(value);
  if (!Number.isNaN(retryDate.getTime())) {
    return Math.max(1, Math.ceil((retryDate.getTime() - Date.now()) / 1000));
  }

  return null;
}

function getFriendlyResponseErrorMessage(
  data: Record<string, unknown>,
  status: number,
  retryAfterSeconds: number | null,
): string {
  if (status === 503) {
    return "The service is temporarily unavailable. Please try again in a few minutes.";
  }

  if (status === 504) {
    return "The request took too long. Please try again.";
  }

  if (status >= 500) {
    return SERVER_ERROR_MESSAGE;
  }

  if (status === 429) {
    return retryAfterSeconds
      ? `Too many attempts. Please wait ${retryAfterSeconds} seconds and try again.`
      : "Too many attempts. Please wait a moment and try again.";
  }

  if (status === 419) {
    return "Your session expired. Refresh the page and try again.";
  }

  const responseMessage =
    typeof data.message === "string" ? data.message.trim() : "";

  if (responseMessage && responseMessage !== "Unauthenticated.") {
    return responseMessage;
  }

  switch (status) {
    case 400:
      return "Please check the information you entered and try again.";
    case 401:
      return "Your session expired. Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested information could not be found.";
    case 409:
      return "This request conflicts with an existing record. Please review the details and try again.";
    case 422:
      return "Please check the highlighted information and try again.";
    default:
      return "We couldn’t complete your request. Please try again.";
  }
}

async function safeFetch(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      NETWORK_ERROR_MESSAGE,
      0,
      null,
      null,
      "NETWORK_ERROR",
    );
  }
}

function clearAuthRoleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "auth_role=; path=/; max-age=0; samesite=lax";
}

function handleUnauthorized(code: string | null): void {
  if (typeof window === "undefined") return;

  clearAuthRoleCookie();
  window.dispatchEvent(
    new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail: { code } }),
  );
}

async function parseResponse(response: Response, clearAuthOnUnauthorized: boolean) {
  const data = await response.json().catch(() => ({}));

  if (
    clearAuthOnUnauthorized &&
    (response.status === 401 || data.code === "ACCOUNT_DISABLED")
  ) {
    handleUnauthorized(typeof data.code === "string" ? data.code : null);
  }

  if (!response.ok) {
    const retryAfterSeconds = parseRetryAfter(
      response.headers.get("Retry-After"),
    );

    throw new ApiError(
      getFriendlyResponseErrorMessage(
        data,
        response.status,
        retryAfterSeconds,
      ),
      response.status,
      retryAfterSeconds,
      data.errors ?? null,
      typeof data.code === "string" ? data.code : null,
    );
  }

  return data;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return null;
  }
}

function isStateChanging(method: string): boolean {
  return !SAFE_METHODS.has(method);
}

function getDeduplicationKey(url: string, method: string): string | null {
  if (method !== "GET") return null;
  return `get:${url}`;
}

function getRetryDelay(attempt: number, lastError?: unknown): number {
  if (
    lastError instanceof ApiError &&
    lastError.status === 429 &&
    lastError.retryAfterSeconds != null &&
    lastError.retryAfterSeconds > 0
  ) {
    const retryAfterMs = lastError.retryAfterSeconds * 1_000;
    const jitter = Math.random() * 1_000;
    return Math.min(retryAfterMs + jitter, RETRY_MAX_DELAY_MS);
  }

  const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay + Math.random() * RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS);
}

function isRetryableError(error: unknown, method: string): boolean {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === "NETWORK_ERROR") return true;
    if (error.status === 429 && method === "GET") return true;
    return false;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return false;
  }
  return true;
}

function getSafeReferrer(): string | undefined {
  return typeof window === "undefined" ? undefined : `${window.location.origin}/`;
}

function getRelativeApiUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//")) {
    throw new Error("API requests must use a same-origin relative URL.");
  }

  const parsed = new URL(url, SAFE_URL_BASE);
  if (
    parsed.origin !== SAFE_URL_BASE ||
    (parsed.pathname !== API_PREFIX &&
      !parsed.pathname.startsWith(`${API_PREFIX}/`)) ||
    parsed.hash
  ) {
    throw new Error(`API requests must stay under ${API_PREFIX}.`);
  }

  return `${parsed.pathname}${parsed.search}`;
}

export async function initializeCsrfCookie(force = false): Promise<void> {
  if (typeof document === "undefined") return;
  if (!force && getCookie("XSRF-TOKEN")) return;

  if (!csrfInitialization) {
    csrfInitialization = (async () => {
      const response = await safeFetch(CSRF_COOKIE_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
        cache: "no-store",
        mode: "same-origin",
        redirect: "error",
        referrer: getSafeReferrer(),
        referrerPolicy: "same-origin",
      });

      if (!response.ok) {
        const retryAfterSeconds = parseRetryAfter(
          response.headers.get("Retry-After"),
        );
        throw new ApiError(
          getFriendlyResponseErrorMessage(
            {},
            response.status,
            retryAfterSeconds,
          ),
          response.status,
          retryAfterSeconds,
        );
      }

      if (!getCookie("XSRF-TOKEN")) {
        throw new ApiError(
          "We couldn’t start a secure session. Refresh the page and try again.",
          419,
        );
      }
    })();
  }

  const currentInitialization = csrfInitialization;
  try {
    await currentInitialization;
  } finally {
    if (csrfInitialization === currentInitialization) {
      csrfInitialization = null;
    }
  }
}

function buildHeaders(options: RequestInit, isFormData: boolean): Headers {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (!isFormData && options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const csrfToken = getCookie("XSRF-TOKEN");
  if (csrfToken) {
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  return headers;
}

async function request(
  url: string,
  options: RequestInit,
  clearAuthOnUnauthorized: boolean,
) {
  const relativeUrl = getRelativeApiUrl(url);
  const method = (options.method ?? "GET").toUpperCase();
  const stateChanging = isStateChanging(method);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (stateChanging) {
    await initializeCsrfCookie();
  }

  const performFetch = () =>
    safeFetch(relativeUrl, {
      ...options,
      method,
      headers: buildHeaders(options, isFormData),
      credentials: "include",
      cache:
        stateChanging ? "no-store" : (options.cache ?? "no-store"),
      mode: "same-origin",
      redirect: "error",
      referrer: getSafeReferrer(),
      referrerPolicy: "same-origin",
    });

  const performNetworkRequest = async (): Promise<Response> => {
    if (method !== "GET") {
      return performFetch();
    }

    await acquireGetSlot(options.signal);
    try {
      return await performFetch();
    } finally {
      releaseGetSlot();
    }
  };

  let response = await performNetworkRequest();

  if (stateChanging && response.status === 419) {
    await initializeCsrfCookie(true);
    response = await performNetworkRequest();
  }

  return parseResponse(response, clearAuthOnUnauthorized);
}

async function requestWithDedupAndRetry(
  url: string,
  options: RequestInit,
  clearAuthOnUnauthorized: boolean,
) {
  const method = (options.method ?? "GET").toUpperCase();
  const dedupKey = getDeduplicationKey(url, method);

  if (dedupKey) {
    const existing = inFlightGetRequests.get(dedupKey);
    if (existing) {
      dedupConsumerCount.set(dedupKey, (dedupConsumerCount.get(dedupKey) ?? 1) + 1);

      const cleanup = () => {
        const count = (dedupConsumerCount.get(dedupKey) ?? 1) - 1;
        if (count <= 0) {
          dedupConsumerCount.delete(dedupKey);
        } else {
          dedupConsumerCount.set(dedupKey, count);
        }
      };

      options.signal?.addEventListener("abort", () => {
        cleanup();
        const remaining = dedupConsumerCount.get(dedupKey) ?? 0;
        if (remaining <= 0) {
          inFlightGetRequests.delete(dedupKey);
        }
      }, { once: true });

      return existing;
    }

    dedupConsumerCount.set(dedupKey, 1);
  }

  const maxRetries = method === "GET" ? GET_MAX_RETRIES : 0;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const shareableOptions = dedupKey
        ? { ...options, signal: undefined }
        : options;

      const result = await request(url, shareableOptions, clearAuthOnUnauthorized);

      if (dedupKey) {
        inFlightGetRequests.delete(dedupKey);
        dedupConsumerCount.delete(dedupKey);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (dedupKey) {
        inFlightGetRequests.delete(dedupKey);
        dedupConsumerCount.delete(dedupKey);
      }

      if (attempt < maxRetries && isRetryableError(error, method)) {
        const delayMs = getRetryDelay(attempt, error);
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, delayMs);
          if (options.signal) {
            options.signal.addEventListener(
              "abort",
              () => {
                clearTimeout(timer);
                resolve();
              },
              { once: true },
            );
          }
        });

        if (options.signal?.aborted) {
          throw error;
        }
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export async function publicFetch(url: string, options: RequestInit = {}) {
  return requestWithDedupAndRetry(url, options, false);
}

export async function authFetch(url: string, options: RequestInit = {}) {
  return requestWithDedupAndRetry(url, options, true);
}
