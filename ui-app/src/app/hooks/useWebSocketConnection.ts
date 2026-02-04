/**
 * WebSocket Connection Hook — CONTRACT ALIGNED
 * 
 * Manages WebSocket connection state and reconnect behavior
 * 
 * CRITICAL Reconnect Flow:
 * 1. On WS close → set wsConnected=false, show stale indicator
 * 2. On reconnect → fetch /api/v1/status, reconcile state, restart timers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketService } from '@/app/services/websocket';
import { API_ENDPOINTS, getApiUrl } from '@/app/config/api';

export interface WebSocketStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  lastDisconnectTime: number | null;
  reconnectAttempt: number;
}

export function useWebSocketConnection() {
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>({
    isConnected: false,
    isReconnecting: false,
    lastDisconnectTime: null,
    reconnectAttempt: 0,
  });

  const reconnectAttemptRef = useRef(0);

  /**
   * Fetch status snapshot from API
   * Called on initial load and after reconnect
   */
  const fetchStatus = useCallback(async () => {
    try {
      console.log('[WS Hook] Fetching status snapshot...');
      const response = await fetch(getApiUrl(API_ENDPOINTS.STATUS));
      
      if (!response.ok) {
        throw new Error(`Status fetch failed: ${response.status}`);
      }

      const statusSnapshot = await response.json();
      console.log('[WS Hook] Status snapshot received:', statusSnapshot);
      
      // TODO: Reconcile status with local state
      // - Update contact stale_after_ms thresholds
      // - Restart age timers
      // - Update telemetry state
      
      return statusSnapshot;
    } catch (error) {
      console.error('[WS Hook] Failed to fetch status:', error);
      return null;
    }
  }, []);

  /**
   * Handle WebSocket connected event
   */
  const handleConnected = useCallback(() => {
    console.log('[WS Hook] WebSocket connected');
    
    setWsStatus({
      isConnected: true,
      isReconnecting: false,
      lastDisconnectTime: null,
      reconnectAttempt: 0,
    });

    reconnectAttemptRef.current = 0;

    // Fetch fresh status after reconnect
    fetchStatus();
  }, [fetchStatus]);

  /**
   * Handle WebSocket disconnected event
   */
  const handleDisconnected = useCallback(() => {
    console.log('[WS Hook] WebSocket disconnected');
    
    setWsStatus(prev => ({
      ...prev,
      isConnected: false,
      isReconnecting: true,
      lastDisconnectTime: Date.now(),
      reconnectAttempt: reconnectAttemptRef.current + 1,
    }));

    reconnectAttemptRef.current++;
  }, []);

  /**
   * Handle max reconnect attempts reached
   */
  const handleMaxReconnectReached = useCallback(() => {
    console.error('[WS Hook] Max reconnect attempts reached');
    
    setWsStatus(prev => ({
      ...prev,
      isConnected: false,
      isReconnecting: false,
    }));
  }, []);

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    // Fetch initial status
    fetchStatus();

    // Register event handlers
    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('max_reconnect_reached', handleMaxReconnectReached);

    // Connect
    webSocketService.connect();

    // Cleanup
    return () => {
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('max_reconnect_reached', handleMaxReconnectReached);
      webSocketService.disconnect();
    };
  }, [fetchStatus, handleConnected, handleDisconnected, handleMaxReconnectReached]);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    console.log('[WS Hook] Manual reconnect requested');
    reconnectAttemptRef.current = 0;
    setWsStatus(prev => ({ ...prev, reconnectAttempt: 0 }));
    webSocketService.disconnect();
    setTimeout(() => webSocketService.connect(), 100);
  }, []);

  return {
    wsStatus,
    reconnect,
  };
}
