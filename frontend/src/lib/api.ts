export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");

  const isFormData = options.body instanceof FormData;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...(token ? { Authorization: token } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch data: ${response.status}`,
    );
  }

  const data = await response.json();

  return data;
  // data.success, data.message, data.data
}
