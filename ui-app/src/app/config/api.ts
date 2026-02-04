/**
 * API Configuration — CONTRACT ALIGNED
 * 
 * SOURCE OF TRUTH: docs/contracts.ts + docs/spces.md
 * 
 * CRITICAL: Use ONLY /api/v1/* endpoints
 * Legacy endpoints (/status, /ws) are for backward compatibility only
 */

/**
 * API Base URL
 * Defaults to current host, can be overridden via environment variable
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * API Version
 */
export const API_VERSION = 'v1';

/**
 * API Endpoints (CANONICAL)
 */
export const API_ENDPOINTS = {
  /**
   * REST Endpoint: System Status
   * Returns: StatusSnapshot
   */
  STATUS: `/api/${API_VERSION}/status`,
  
  /**
   * WebSocket Endpoint: Real-time Updates
   * Protocol: ws:// or wss://
   */
  WEBSOCKET: `/api/${API_VERSION}/ws`,
} as const;

/**
 * Legacy endpoints (DO NOT USE in new code)
 * Documented for reference only
 */
export const LEGACY_ENDPOINTS = {
  STATUS: '/status',      // LEGACY DEBUG ONLY
  WEBSOCKET: '/ws',       // LEGACY DEBUG ONLY
} as const;

/**
 * Get WebSocket URL
 * Constructs full WebSocket URL from current location
 */
export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}${API_ENDPOINTS.WEBSOCKET}`;
}

/**
 * Get API URL
 * Constructs full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
