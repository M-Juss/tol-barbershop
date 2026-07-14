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

function clearAuthRoleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie =
    "auth_role=; path=/; max-age=0; samesite=lax";
}

async function parseResponse(response: Response) {
  if (response.status === 401) {
    clearAuthRoleCookie();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || `Failed to fetch data: ${response.status}`,
      response.status,
      parseRetryAfter(response.headers.get("Retry-After")),
      data.errors ?? null,
      typeof data.code === "string" ? data.code : null,
    );
  }

  return data;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function getCsrfHeaders(method: string | undefined): Record<string, string> {
  if (!method || ["GET", "HEAD"].includes(method.toUpperCase())) {
    return {};
  }
  const csrfToken = getCookie("XSRF-TOKEN");
  if (csrfToken) {
    return { "X-XSRF-TOKEN": csrfToken };
  }
  return {};
}

export async function publicFetch(url: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const method = options.method;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...getCsrfHeaders(method),
    } as HeadersInit,
    credentials: "include",
  });

  return parseResponse(response);
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const method = options.method;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...getCsrfHeaders(method),
    } as HeadersInit,
    credentials: "include",
  });

  return parseResponse(response);
}
