/**
 * Contact Type Definitions — CONTRACT ALIGNED
 * 
 * SOURCE OF TRUTH: docs/contracts.ts + spces.md
 * 
 * CRITICAL NAMING RULES:
 * - Remote ID uses lat/lon (NOT lng)
 * - Timestamps are in milliseconds (ms)
 * - Frequencies are in Hz (freq_hz, NOT freq_mhz)
 * - GPS uses latitude/longitude (separate from Remote ID lat/lon)
 */

/**
 * Base Contact Interface
 * All contacts share these fields regardless of type
 */
export interface BaseContact {
  // Identity
  id: string;
  type: 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF';  // ✅ Contract uses uppercase with underscore
  
  // Timing (ALL in milliseconds)
  last_seen_ts: number;       // ✅ Milliseconds timestamp (NOT Date object)
  first_seen_ts?: number;     // ✅ Milliseconds timestamp
  stale_after_ms: number;     // ✅ Milliseconds duration
  
  // Source tracking (from WS envelope)
  source: 'live' | 'replay';  // ✅ Must show REPLAY badge when 'replay'
  
  // Severity (for UI display - may be computed by backend)
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  
  // UI-only fields (not from backend)
  isPinned?: boolean;         // Local UI state
  tags?: string[];            // Local UI state
}

/**
 * Remote ID Contact
 * Coordinates use lat/lon (NOT lng)
 */
export interface RemoteIdContact extends BaseContact {
  type: 'REMOTE_ID';
  
  remote_id: {
    // Basic info
    model?: string;
    serial_id?: string;         // ✅ Contract uses serial_id with underscore
    operator_id?: string;
    
    // Coordinates - CRITICAL: Use lat/lon, NOT lng
    drone_coords?: {
      lat: number;              // ✅ CORRECT
      lon: number;              // ✅ CORRECT (NOT lng)
      alt_m: number;            // ✅ Meters
    };
    
    pilot_coords?: {
      lat: number;              // ✅ CORRECT
      lon: number;              // ✅ CORRECT (NOT lng)
    };
    
    home_coords?: {
      lat: number;              // ✅ CORRECT
      lon: number;              // ✅ CORRECT (NOT lng)
    };
    
    // Additional fields
    uas_id?: string;
    flight_desc?: string;
    timestamp_accuracy?: number;
    speed_accuracy?: number;
    vert_accuracy?: number;
  };
  
  // Computed fields (UI calculates from GPS + coords)
  distance_m?: number;          // Computed, not from backend
  bearing_deg?: number;         // Computed, not from backend
}

/**
 * FPV Link Contact
 * Frequency is in Hz (NOT MHz)
 */
export interface FpvLinkContact extends BaseContact {
  type: 'FPV_LINK';
  
  fpv_link: {
    // Frequency - CRITICAL: Always in Hz
    freq_hz: number;            // ✅ CORRECT (NOT freq_mhz)
    
    // Signal strength
    rssi_dbm: number;           // ✅ dBm
    
    // Lock state
    lock_state: 'scanning' | 'locked' | 'hold';
    
    // Band info
    band?: string;              // e.g., "5.8GHz"
    channel?: number;
    
    // Detection quality
    threshold?: string;         // e.g., "Balanced", "Critical Focus"
    hit_count?: number;
    confidence?: number;
  };
}

/**
 * Unknown RF Contact
 * Generic RF signal that doesn't match Remote ID or FPV
 */
export interface UnknownRfContact extends BaseContact {
  type: 'UNKNOWN_RF';
  
  unknown_rf?: {
    signal_strength?: number;
    notes?: string;
    // Additional unknown signal fields
  };
}

/**
 * Union type for all contact types
 */
export type Contact = RemoteIdContact | FpvLinkContact | UnknownRfContact;

/**
 * Type guards for contact types
 */
export function isRemoteIdContact(contact: Contact): contact is RemoteIdContact {
  return contact.type === 'REMOTE_ID';
}

export function isFpvLinkContact(contact: Contact): contact is FpvLinkContact {
  return contact.type === 'FPV_LINK';
}

export function isUnknownRfContact(contact: Contact): contact is UnknownRfContact {
  return contact.type === 'UNKNOWN_RF';
}

/**
 * Helper functions for contact data access
 */

/**
 * Get display frequency in MHz from Hz
 * @param freq_hz Frequency in Hz (from backend)
 * @returns Frequency in MHz (for display)
 */
export function getDisplayFrequencyMHz(freq_hz: number): number {
  return freq_hz / 1_000_000;
}

/**
 * Get display frequency in GHz from Hz
 * @param freq_hz Frequency in Hz (from backend)
 * @returns Frequency in GHz (for display)
 */
export function getDisplayFrequencyGHz(freq_hz: number): number {
  return freq_hz / 1_000_000_000;
}

/**
 * Check if contact is stale based on timestamp
 * @param contact Contact to check
 * @returns true if contact is stale
 */
export function isContactStale(contact: Contact): boolean {
  const age_ms = Date.now() - contact.last_seen_ts;
  return age_ms > contact.stale_after_ms;
}

/**
 * Check if contact is lost (very stale)
 * Threshold: 5x stale_after_ms
 * @param contact Contact to check
 * @returns true if contact is lost
 */
export function isContactLost(contact: Contact): boolean {
  const age_ms = Date.now() - contact.last_seen_ts;
  return age_ms > (contact.stale_after_ms * 5);
}

/**
 * Get time since last seen in human-readable format
 * @param last_seen_ts Timestamp in ms
 * @returns Formatted string like "30s ago", "2m ago", etc.
 */
export function getTimeSinceLastSeen(last_seen_ts: number): string {
  const age_ms = Date.now() - last_seen_ts;
  const seconds = Math.floor(age_ms / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Legacy type mapping (for migration)
 * Maps old UI types to new contract types
 */
export function mapLegacyContactType(
  legacyType: 'remote-id' | 'fpv' | 'unknown'
): 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF' {
  switch (legacyType) {
    case 'remote-id':
      return 'REMOTE_ID';
    case 'fpv':
      return 'FPV_LINK';
    case 'unknown':
      return 'UNKNOWN_RF';
  }
}

/**
 * MIGRATION COMPATIBILITY (TEMPORARY)
 * These interfaces are for backward compatibility only
 * TODO: Remove after all components updated to contract types
 */

/** @deprecated Use RemoteIdContact with remote_id.drone_coords.lon instead */
export interface LegacyRemoteIdContact {
  droneCoords?: { lat: number; lng: number; alt: number };  // lng is WRONG
}

/** @deprecated Use FpvLinkContact with fpv_link.freq_hz instead */
export interface LegacyFpvContact {
  frequency: number;  // Assumed MHz, WRONG
}
