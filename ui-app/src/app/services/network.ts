import { getApiUrl } from '@/app/config/api';

type ApiResult<T = any> =
  | { ok: true; data?: T }
  | { ok: false; error: string; detail?: string };

async function requestJson<T = any>(endpoint: string, options: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(getApiUrl(endpoint), {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || 'request_failed', detail: data?.detail };
    }
    if (data?.ok === false) {
      return { ok: false, error: data?.error || 'request_failed', detail: data?.detail };
    }
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'network_error' };
  }
}

export function getNetworkStatus() {
  return requestJson('/api/v1/network/status', { method: 'GET' });
}

export function scanWifi() {
  return requestJson('/api/v1/network/wifi/scan', { method: 'POST', body: '{}' });
}

export function connectWifi(payload: { ssid: string; password?: string; iface?: string; force?: boolean }) {
  return requestJson('/api/v1/network/wifi/connect', { method: 'POST', body: JSON.stringify(payload) });
}

export function disconnectWifi(payload: { iface?: string; force?: boolean } = {}) {
  return requestJson('/api/v1/network/wifi/disconnect', { method: 'POST', body: JSON.stringify(payload) });
}

export function forgetWifi(payload: { ssid: string; force?: boolean }) {
  return requestJson('/api/v1/network/wifi/forget', { method: 'POST', body: JSON.stringify(payload) });
}

export function setWifiRadio(enabled: boolean, force?: boolean) {
  return requestJson('/api/v1/network/wifi/radio', {
    method: 'POST',
    body: JSON.stringify({ enabled, force }),
  });
}

export function getBluetoothStatus() {
  return requestJson('/api/v1/network/bt/status', { method: 'GET' });
}

export function startBluetoothScan() {
  return requestJson('/api/v1/network/bt/scan/start', { method: 'POST', body: '{}' });
}

export function stopBluetoothScan() {
  return requestJson('/api/v1/network/bt/scan/stop', { method: 'POST', body: '{}' });
}

export function pairBluetooth(payload: { mac: string }) {
  return requestJson('/api/v1/network/bt/pair', { method: 'POST', body: JSON.stringify(payload) });
}

export function connectBluetooth(payload: { mac: string }) {
  return requestJson('/api/v1/network/bt/connect', { method: 'POST', body: JSON.stringify(payload) });
}

export function disconnectBluetooth(payload: { mac: string }) {
  return requestJson('/api/v1/network/bt/disconnect', { method: 'POST', body: JSON.stringify(payload) });
}

export function unpairBluetooth(payload: { mac: string }) {
  return requestJson('/api/v1/network/bt/unpair', { method: 'POST', body: JSON.stringify(payload) });
}

export function setBluetoothPower(enabled: boolean) {
  return requestJson('/api/v1/network/bt/power', { method: 'POST', body: JSON.stringify({ enabled }) });
}

export function setBluetoothDiscoverable(enabled: boolean) {
  return requestJson('/api/v1/network/bt/discoverable', { method: 'POST', body: JSON.stringify({ enabled }) });
}
