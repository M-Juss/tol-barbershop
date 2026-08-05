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
  "We’re having trouble connecting right now. Check your internet connection and try again in a few moments.";
const SERVER_ERROR_MESSAGE =
  "Something went wrong on our side. Please try again later.";

let csrfInitialization: Promise<void> | null = null;

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

  let response = await performFetch();

  if (stateChanging && response.status === 419) {
    await initializeCsrfCookie(true);
    response = await performFetch();
  }

  return parseResponse(response, clearAuthOnUnauthorized);
}

export async function publicFetch(url: string, options: RequestInit = {}) {
  return request(url, options, false);
}

export async function authFetch(url: string, options: RequestInit = {}) {
  return request(url, options, true);
}
