// client.ts — API client dasar (fetch-based, tanpa dependency ekstra).
// Fase 6.4 — validasi koneksi FE↔BE.
//
// Base URL backend bisa di-override via env VITE_API_BASE
// (mis. http://localhost:8000). Default ke 8000 sesuai rencana.

const API_BASE =
  ((import.meta.env as unknown as Record<string, string | undefined>).VITE_API_BASE) ??
  'http://localhost:8000';

export { API_BASE };

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Request ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// image_url dari backend berupa path relatif ("/static/cards/xxx.png").
// Untuk ditampilkan di <img> React, harus di-prefix base URL backend
// (img cross-origin tidak bisa pakai path relatif terhadap origin Vite).
export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}
