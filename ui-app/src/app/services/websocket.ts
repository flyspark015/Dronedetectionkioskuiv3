/**
 * WebSocket Service — CONTRACT ALIGNED
 * 
 * SOURCE OF TRUTH: docs/contracts.ts + docs/spces.md
 * 
 * CRITICAL: ALL WebSocket messages use envelope format:
 * { type, timestamp, source, data }
 */

import { API_ENDPOINTS, getWebSocketUrl } from '@/app/config/api';

/**
 * WebSocket Envelope (MANDATORY)
 * ALL WebSocket messages MUST have this structure
 */
export interface WebSocketEnvelope<T = any> {
  type: string;                           // Event type
  timestamp: number;                      // Milliseconds since epoch
  source: 'live' | 'replay' | 'backend';  // Data source
  data: T;                                // Event payload
}

/**
 * WebSocket Event Types (CANONICAL)
 * ONLY these event types are supported
 */
export type WebSocketEventType =
  | 'TELEMETRY_UPDATE'
  | 'CONTACT_NEW'
  | 'CONTACT_UPDATE'
  | 'CONTACT_LOST'
  | 'REPLAY_STATE'
  | 'NETWORK_UPDATE'
  // Future events
  | 'ALERT_NEW'
  | 'ALERT_UPDATE'
  | 'LOG_EVENT'
  | 'COMMAND_ACK';

/**
 * WebSocket Event Handler
 */
export type WebSocketEventHandler<T = any> = (
  data: T,
  envelope: WebSocketEnvelope<T>
) => void;

/**
 * WebSocket Service
 * Handles WebSocket connection with envelope parsing
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds
  private reconnectTimer: number | null = null;

  /**
   * Connect to WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    const url = getWebSocketUrl();
    console.log('[WebSocket] Connecting to:', url);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.emit('connected', null);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.emit('error', { error });
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.emit('disconnected', null);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      this.emit('max_reconnect_reached', null);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Handle incoming WebSocket message
   * Parses envelope and routes to handlers
   */
  private handleMessage(rawData: string): void {
    try {
      const message = JSON.parse(rawData);

      // Validate envelope structure
      if (!this.isValidEnvelope(message)) {
        console.error('[WebSocket] Invalid envelope structure:', message);
        console.error('[WebSocket] Expected: { type, timestamp, source, data }');
        return; // Reject message
      }

      const envelope = message as WebSocketEnvelope;

      // Log unknown event types (but don't crash)
      if (!this.isKnownEventType(envelope.type)) {
        console.warn('[WebSocket] Unknown event type:', envelope.type);
        console.warn('[WebSocket] Known types:', [
          'TELEMETRY_UPDATE',
          'CONTACT_NEW',
          'CONTACT_UPDATE',
          'CONTACT_LOST',
          'REPLAY_STATE',
          'NETWORK_UPDATE',
        ]);
        // Continue processing (might be future event type)
      }

      // TEMP COMPAT: Backend drift - map legacy RID_* events to contract events
      // TODO: Remove once backend fixed to send CONTACT_* events
      let mappedType = envelope.type;
      if (envelope.type.startsWith('RID_CONTACT_')) {
        console.warn('[WebSocket] BACKEND DRIFT DETECTED:', envelope.type);
        console.warn('[WebSocket] Mapping to contract event type');
        mappedType = envelope.type.replace('RID_CONTACT_', 'CONTACT_');
        console.warn('[WebSocket] Mapped:', envelope.type, '→', mappedType);
      }

      // Route to handlers
      this.emit(mappedType, envelope.data, { ...envelope, type: mappedType });

    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
      console.error('[WebSocket] Raw data:', rawData);
    }
  }

  /**
   * Validate envelope structure
   */
  private isValidEnvelope(message: any): message is WebSocketEnvelope {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'number' &&
      typeof message.source === 'string' &&
      'data' in message
    );
  }

  /**
   * Check if event type is known
   */
  private isKnownEventType(type: string): boolean {
    const knownTypes: WebSocketEventType[] = [
      'TELEMETRY_UPDATE',
      'CONTACT_NEW',
      'CONTACT_UPDATE',
      'CONTACT_LOST',
      'REPLAY_STATE',
      'NETWORK_UPDATE',
      'ALERT_NEW',
      'ALERT_UPDATE',
      'LOG_EVENT',
      'COMMAND_ACK',
    ];
    return knownTypes.includes(type as WebSocketEventType);
  }

  /**
   * Register event handler
   */
  on<T = any>(event: string, handler: WebSocketEventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as WebSocketEventHandler);
  }

  /**
   * Unregister event handler
   */
  off<T = any>(event: string, handler: WebSocketEventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as WebSocketEventHandler);
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, data: any, envelope?: WebSocketEnvelope): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data, envelope || { type: event, timestamp: Date.now(), source: 'backend', data });
        } catch (error) {
          console.error(`[WebSocket] Handler error for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send message to WebSocket
   */
  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('[WebSocket] Cannot send - not connected');
    }
  }

  /**
   * Get connection state
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Singleton WebSocket service instance
 */
export const webSocketService = new WebSocketService();
