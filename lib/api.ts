const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const TOKEN_KEY = 'awp_token';
export const USER_KEY = 'awp_user';

export class ApiClientError extends Error {
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(status: number, message: string, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const token = auth ? readToken() : null;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // A dead session should send the user back to the login screen, not fail silently.
    if (response.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    throw new ApiClientError(
      response.status,
      payload?.error?.message ?? 'Request failed',
      payload?.error?.details
    );
  }

  return payload?.data as T;
}
