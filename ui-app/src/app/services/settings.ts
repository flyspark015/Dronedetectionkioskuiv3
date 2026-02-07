import { getApiUrl } from '@/app/config/api';

type ApiResult<T = any> = { ok: true; data?: T } | { ok: false; error: string };

async function requestJson<T = any>(endpoint: string, options: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(getApiUrl(endpoint), {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || 'request_failed' };
    }
    if (data?.ok === false) {
      return { ok: false, error: data?.error || 'request_failed' };
    }
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'network_error' };
  }
}

export function updateUiSettings(payload: { brightness?: number; glove_mode?: boolean; performance_mode?: boolean }) {
  return requestJson('/api/v1/settings/ui', { method: 'PUT', body: JSON.stringify(payload) });
}

export function updateAudioSettings(payload: { volume?: number }) {
  return requestJson('/api/v1/settings/audio', { method: 'PUT', body: JSON.stringify(payload) });
}

export function getSystemVolume() {
  return requestJson('/api/v1/audio/volume', { method: 'GET' });
}

export function setSystemVolume(percent: number) {
  return requestJson('/api/v1/audio/volume', { method: 'POST', body: JSON.stringify({ percent }) });
}

export function updateMapsSettings(payload: { mode?: 'online' | 'offline' | 'auto'; offline_pack_id?: string | null }) {
  return requestJson('/api/v1/settings/maps', { method: 'PUT', body: JSON.stringify(payload) });
}

export function updateAlertsSettings(payload: { preset: 'Balanced' | 'Critical Focus' | 'Training' }) {
  return requestJson('/api/v1/settings/alerts', { method: 'PUT', body: JSON.stringify(payload) });
}

export function rebootUi(dryRun = false) {
  return requestJson('/api/v1/system/reboot_ui', { method: 'POST', body: JSON.stringify({ confirm: true, dry_run: dryRun }) });
}

export function rebootDevice(dryRun = false) {
  return requestJson('/api/v1/system/reboot_device', { method: 'POST', body: JSON.stringify({ confirm: true, dry_run: dryRun }) });
}

export function buzzerTest() {
  return requestJson('/api/v1/esp32/buzzer_test', { method: 'POST', body: JSON.stringify({ duration_ms: 200 }) });
}

export function getMapPacks() {
  return requestJson('/api/v1/maps/packs', { method: 'GET' });
}

export function getPmtilesPacks() {
  return requestJson('/api/v1/maps/pmtiles/packs', { method: 'GET' });
}

export function getPmtilesCatalog() {
  return requestJson('/api/v1/maps/pmtiles/catalog', { method: 'GET' });
}

export function deletePmtilesPack(id: string) {
  return requestJson('/api/v1/maps/pmtiles/delete', { method: 'POST', body: JSON.stringify({ id }) });
}

export function selectPmtilesPack(id: string) {
  return requestJson('/api/v1/maps/pmtiles/select', { method: 'POST', body: JSON.stringify({ id }) });
}

export function startPmtilesJob(payload: { id: string; force?: boolean; set_active?: boolean }) {
  return requestJson('/api/v1/maps/pmtiles/download/start', { method: 'POST', body: JSON.stringify(payload) });
}

export function getPmtilesJobs() {
  return requestJson('/api/v1/maps/pmtiles/jobs', { method: 'GET' });
}

export function getMapPackStatus(id: string) {
  return requestJson(`/api/v1/maps/packs/${id}/status`, { method: 'GET' });
}

export function downloadMapPack(payload: { name: string; bbox: any; zmin: number; zmax: number; pack_id?: string }) {
  return requestJson('/api/v1/maps/packs/download', { method: 'POST', body: JSON.stringify(payload) });
}

export function deleteMapPack(id: string) {
  return requestJson(`/api/v1/maps/packs/${id}/delete`, { method: 'POST', body: '{}' });
}

export function redownloadMapPack(id: string) {
  return requestJson(`/api/v1/maps/packs/${id}/redownload`, { method: 'POST', body: '{}' });
}

export function videoCaptureToggle(enabled: boolean) {
  return requestJson('/api/v1/video/capture', { method: 'POST', body: JSON.stringify({ enabled }) });
}

export function rfScanAction(action: string, payload: Record<string, any> = {}) {
  return requestJson('/api/v1/settings/rfscan/action', {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  });
}
