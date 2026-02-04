import { API_ENDPOINTS, getApiUrl } from '@/app/config/api';

export async function fetchStatusSnapshot() {
  const res = await fetch(getApiUrl(API_ENDPOINTS.STATUS), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`status_fetch_failed:${res.status}`);
  }
  return res.json();
}
