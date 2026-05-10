const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const AUTH_TOKEN_KEY = "ai_ops_monitor_token";

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getWebSocketUrl(token?: string | null) {
  const baseUrl =
    process.env.NEXT_PUBLIC_WS_URL ??
    `${API_URL.replace(/^http/, "ws")}/ws`;

  if (!token) {
    return baseUrl;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getAuthToken()
        ? {
            Authorization: `Bearer ${getAuthToken()}`,
          }
        : {}),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    clearAuthToken();
  }

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}
