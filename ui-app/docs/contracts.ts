/**
 * N-Defender UI Contracts (TypeScript)
 * 
 * SOURCE OF TRUTH:
 * - Data contract: contracts.ts (this file) + schema.json
 * - UX & behavior rules: spces.md
 * - Integration rules: data-binding-map.md
 * 
 * Last Updated: 2026-01-26
 * Status: ✅ Canonical Contract Definitions
 * 
 * CRITICAL NAMING RULES:
 * - GPS uses: latitude, longitude (NOT lat/lng)
 * - Remote ID uses: lat, lon (NOT lng)
 * - Frequencies: freq_hz (NOT freq_mhz)
 * - Timestamps: milliseconds (NOT seconds)
 */

// ============================================================================
// GPS STATUS
// ============================================================================

/**
 * GPS Fix Quality Levels
 */
export enum GPSFixQuality {
  NONE = 0,   // No GPS fix
  GPS = 1,    // Standard GPS (5-10m accuracy)
  DGPS = 2    // Differential GPS (<1m accuracy)
}

/**
 * GPS Status from /api/v1/status
 * 
 * NAMING RULES:
 * - latitude/longitude (NOT lat/lng)
 * - speed_mps (meters per second)
 * - heading_deg (degrees)
 * - alt_m (meters)
 */
export interface GPSStatus {
  latitude: number;         // ✅ NOT gps.lat
  longitude: number;        // ✅ NOT gps.lng
  alt_m: number;            // Altitude in meters
  speed_mps: number;        // Speed in meters per second
  heading_deg: number;      // Heading in degrees (0-360)
  fix_quality: GPSFixQuality; // 0=none, 1=gps, 2=dgps
  hdop: number;             // Horizontal dilution of precision
  sats: number;             // Number of satellites
  timestamp: number;        // Milliseconds since epoch
}

/**
 * Check if GPS is valid for distance/bearing calculations
 * 
 * RULE: Only fix_quality >= 2 (DGPS) is accurate enough
 */
export function hasValidGPS(gps: GPSStatus): boolean {
  return gps.fix_quality >= GPSFixQuality.DGPS;
}

// ============================================================================
// CONTACT MODEL
// ============================================================================

/**
 * Contact Type (CANONICAL)
 * 
 * LEGACY TYPES (DO NOT USE):
 * - 'remote-id' → Use 'REMOTE_ID'
 * - 'fpv' → Use 'FPV_LINK'
 * - 'unknown' → Use 'UNKNOWN_RF'
 */
export type ContactType = 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF';

/**
 * Contact Source
 */
export type ContactSource = 'live' | 'replay';

/**
 * Contact Severity
 */
export type ContactSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Base Contact Interface
 * All contacts share these fields
 */
export interface BaseContact {
  // Identity
  id: string;
  type: ContactType;
  
  // Timing (ALL in milliseconds)
  last_seen_ts: number;       // ✅ Milliseconds (NOT Date object)
  first_seen_ts: number;      // ✅ Milliseconds
  
  // Source tracking (from WS envelope)
  source: ContactSource;      // 'live' or 'replay'
  
  // Severity
  severity: ContactSeverity;
  
  // UI-only fields (not from backend)
  isPinned?: boolean;
  tags?: string[];
}

/**
 * Remote ID Contact
 * 
 * NAMING RULES:
 * - Coordinates use lat/lon (NOT lng)
 * - serial_id with underscore
 */
export interface RemoteIdContact extends BaseContact {
  type: 'REMOTE_ID';
  
  remote_id: {
    // Basic info
    model?: string;
    serial_id?: string;         // ✅ serial_id with underscore
    operator_id?: string;
    uas_id?: string;
    
    // Coordinates - CRITICAL: Use lat/lon, NOT lng
    drone_coords?: {
      lat: number;              // ✅ lat (NOT latitude)
      lon: number;              // ✅ lon (NOT lng)
      alt_m: number;            // Meters
      speed_mps?: number;       // Meters per second
      heading_deg?: number;     // Degrees
      last_update_ts?: number;  // Milliseconds
    };
    
    pilot_coords?: {
      lat: number;              // ✅ lat (NOT latitude)
      lon: number;              // ✅ lon (NOT lng)
    };
    
    home_coords?: {
      lat: number;              // ✅ lat (NOT latitude)
      lon: number;              // ✅ lon (NOT lng)
    };
    
    // Additional metadata
    flight_desc?: string;
    timestamp_accuracy?: number;
    speed_accuracy?: number;
    vert_accuracy?: number;
  };
  
  // Derived fields (UI computes from GPS + coords)
  derived?: {
    distance_m?: number;        // Distance in meters (GPS-gated)
    bearing_deg?: number;       // Bearing in degrees (GPS-gated)
  };
}

/**
 * FPV Link Contact
 * 
 * NAMING RULES:
 * - Frequency is freq_hz (NOT freq_mhz)
 * - RSSI is rssi_dbm (calibrated dBm)
 */
export interface FpvLinkContact extends BaseContact {
  type: 'FPV_LINK';
  
  fpv_link: {
    // Frequency - CRITICAL: Always in Hz
    freq_hz: number;            // ✅ Hz (NOT freq_mhz)
    
    // Signal strength
    rssi_dbm: number;           // ✅ Calibrated dBm
    
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
 */
export interface UnknownRfContact extends BaseContact {
  type: 'UNKNOWN_RF';
  
  unknown_rf?: {
    signal_strength?: number;
    notes?: string;
  };
}

/**
 * Union type for all contact types
 */
export type Contact = RemoteIdContact | FpvLinkContact | UnknownRfContact;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isRemoteIdContact(contact: Contact): contact is RemoteIdContact {
  return contact.type === 'REMOTE_ID';
}

export function isFpvLinkContact(contact: Contact): contact is FpvLinkContact {
  return contact.type === 'FPV_LINK';
}

export function isUnknownRfContact(contact: Contact): contact is UnknownRfContact {
  return contact.type === 'UNKNOWN_RF';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get display frequency in MHz from Hz
 */
export function getDisplayFrequencyMHz(freq_hz: number): number {
  return freq_hz / 1_000_000;
}

/**
 * Get display frequency in GHz from Hz
 */
export function getDisplayFrequencyGHz(freq_hz: number): number {
  return freq_hz / 1_000_000_000;
}

/**
 * Check if contact is stale (15-60 seconds old)
 */
export function isContactStale(contact: Contact): boolean {
  const age_ms = Date.now() - contact.last_seen_ts;
  return age_ms >= 15_000 && age_ms < 60_000;
}

/**
 * Check if contact is lost (>60 seconds old)
 */
export function isContactLost(contact: Contact): boolean {
  const age_ms = Date.now() - contact.last_seen_ts;
  return age_ms >= 60_000;
}

/**
 * Get time since last seen in human-readable format
 */
export function getTimeSinceLastSeen(last_seen_ts: number): string {
  const age_ms = Date.now() - last_seen_ts;
  const seconds = Math.floor(age_ms / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// STATUS SNAPSHOT (from /api/v1/status)
// ============================================================================

export interface ESP32Status {
  state: 'connected' | 'disconnected';
  version?: string;
}

export interface FPVScannerStatus {
  state: 'scanning' | 'locked' | 'hold' | 'stopped';
  band?: string;
  threshold?: string;
}

export interface RemoteIdStatus {
  state: 'active' | 'inactive';
}

export interface SystemStatus {
  storage_free_gb: number;
  cpu_temp_c: number;
  battery_level?: number;
  network_status?: string;
}

/**
 * Status Snapshot from GET /api/v1/status
 */
export interface StatusSnapshot {
  timestamp: number;          // ✅ Milliseconds
  gps: GPSStatus;
  esp32: ESP32Status;
  fpv_scanner: FPVScannerStatus;
  remote_id: RemoteIdStatus;
  system: SystemStatus;
}

// ============================================================================
// WEBSOCKET ENVELOPE (MANDATORY)
// ============================================================================

/**
 * WebSocket Envelope
 * 
 * ALL WebSocket messages use this structure
 */
export interface WebSocketEnvelope<T = any> {
  type: string;                           // Event type
  timestamp: number;                      // ✅ Milliseconds
  source: 'live' | 'replay';              // Data source
  data: T;                                // Event payload
}

/**
 * WebSocket Event Types (CANONICAL)
 */
export type WebSocketEventType =
  | 'TELEMETRY_UPDATE'
  | 'CONTACT_NEW'
  | 'CONTACT_UPDATE'
  | 'CONTACT_LOST'
  | 'REPLAY_STATE';

/**
 * TELEMETRY_UPDATE event data
 */
export interface TelemetryUpdateData {
  gps?: Partial<GPSStatus>;
  esp32?: Partial<ESP32Status>;
  fpv_scanner?: Partial<FPVScannerStatus>;
  remote_id?: Partial<RemoteIdStatus>;
  system?: Partial<SystemStatus>;
}

/**
 * CONTACT_NEW event data
 */
export type ContactNewData = Contact;

/**
 * CONTACT_UPDATE event data
 */
export type ContactUpdateData = Partial<Contact> & { id: string };

/**
 * CONTACT_LOST event data
 */
export interface ContactLostData {
  id: string;
}

/**
 * REPLAY_STATE event data
 */
export interface ReplayStateData {
  is_replaying: boolean;
  replay_speed?: number;        // 1.0 = normal speed
  replay_timestamp?: number;    // Current replay timestamp (ms)
}

// ============================================================================
// ALERTS (FUTURE)
// ============================================================================

export interface Alert {
  id: string;
  contact_id?: string;
  severity: ContactSeverity;
  title: string;
  message: string;
  timestamp: number;            // ✅ Milliseconds
  status: 'active' | 'acknowledged' | 'resolved';
}

// ============================================================================
// LOGS (FUTURE)
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: number;            // ✅ Milliseconds
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  tags?: string[];
}

// ============================================================================
// DISTANCE/BEARING CALCULATION (UI-SIDE)
// ============================================================================

/**
 * Compute distance between two lat/lon points (Haversine formula)
 * 
 * INPUTS:
 * - userLat: GPS latitude (from gps.latitude)
 * - userLon: GPS longitude (from gps.longitude)
 * - targetLat: Remote ID lat (from drone_coords.lat)
 * - targetLon: Remote ID lon (from drone_coords.lon)
 * 
 * OUTPUT:
 * - Distance in meters
 */
export function computeDistance(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (userLat * Math.PI) / 180;
  const φ2 = (targetLat * Math.PI) / 180;
  const Δφ = ((targetLat - userLat) * Math.PI) / 180;
  const Δλ = ((targetLon - userLon) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

/**
 * Compute bearing from user to target (degrees)
 * 
 * INPUTS:
 * - userLat: GPS latitude (from gps.latitude)
 * - userLon: GPS longitude (from gps.longitude)
 * - targetLat: Remote ID lat (from drone_coords.lat)
 * - targetLon: Remote ID lon (from drone_coords.lon)
 * 
 * OUTPUT:
 * - Bearing in degrees (0-360)
 */
export function computeBearing(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number
): number {
  const φ1 = (userLat * Math.PI) / 180;
  const φ2 = (targetLat * Math.PI) / 180;
  const Δλ = ((targetLon - userLon) * Math.PI) / 180;
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  
  return ((θ * 180) / Math.PI + 360) % 360; // Bearing in degrees
}

/**
 * Compute derived fields for Remote ID contact
 * 
 * RULES:
 * - Only compute if GPS is valid (fix_quality >= 2)
 * - Only compute if contact has drone_coords
 */
export function computeDerivedFields(
  contact: RemoteIdContact,
  gps: GPSStatus
): RemoteIdContact {
  // GPS gating: Only compute if fix_quality >= 2
  if (!hasValidGPS(gps)) {
    return contact;
  }
  
  // Check if contact has drone coords
  if (!contact.remote_id.drone_coords) {
    return contact;
  }
  
  const { lat, lon } = contact.remote_id.drone_coords;
  
  return {
    ...contact,
    derived: {
      distance_m: Math.round(computeDistance(gps.latitude, gps.longitude, lat, lon)),
      bearing_deg: Math.round(computeBearing(gps.latitude, gps.longitude, lat, lon))
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  // GPS
  GPSStatus,
  
  // Contacts
  Contact,
  ContactType,
  ContactSource,
  ContactSeverity,
  BaseContact,
  RemoteIdContact,
  FpvLinkContact,
  UnknownRfContact,
  
  // Status
  StatusSnapshot,
  ESP32Status,
  FPVScannerStatus,
  RemoteIdStatus,
  SystemStatus,
  
  // WebSocket
  WebSocketEnvelope,
  WebSocketEventType,
  TelemetryUpdateData,
  ContactNewData,
  ContactUpdateData,
  ContactLostData,
  ReplayStateData,
  
  // Future
  Alert,
  LogEntry
};

export {
  // Enums
  GPSFixQuality,
  
  // Type Guards
  isRemoteIdContact,
  isFpvLinkContact,
  isUnknownRfContact,
  
  // Helper Functions
  hasValidGPS,
  getDisplayFrequencyMHz,
  getDisplayFrequencyGHz,
  isContactStale,
  isContactLost,
  getTimeSinceLastSeen,
  computeDistance,
  computeBearing,
  computeDerivedFields
};
