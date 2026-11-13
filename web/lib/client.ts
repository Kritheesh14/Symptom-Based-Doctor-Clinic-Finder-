'use client';
import { useCallback, useEffect, useState } from 'react';
 
/** fetch JSON; throws Error(message) using the API's { error } body. */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}
 
/** Load JSON from an API route; pass null to skip. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(url !== null);
 
  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [url]);
 
  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load };
}
 
export function formatDateTime(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
 
export function formatDate(s: string | null | undefined): string {
  if (!s) return '';
  return new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' });
}
 
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
