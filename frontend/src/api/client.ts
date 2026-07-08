// client.ts — API client dasar (fetch-based, tanpa dependency ekstra).
// Fase 6.4 (base URL + assetUrl) & Fase 6.5 (JWT token + POST).

const API_BASE =
  ((import.meta.env as unknown as Record<string, string | undefined>).VITE_API_BASE) ??
  'http://localhost:8000';

export { API_BASE };

const TOKEN_KEY = 'nexus_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* localStorage unavailable — ignore */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      if (err?.detail) detail = ` — ${JSON.stringify(err.detail)}`;
    } catch {
      /* ignore non-JSON error body */
    }
    throw new Error(`Request ${path} failed: ${res.status} ${res.statusText}${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function fetchJson<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

// image_url dari backend berupa path relatif ("/static/cards/xxx.png").
// Untuk ditampilkan di <img> React, harus di-prefix base URL backend.
export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}
