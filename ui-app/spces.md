# N-Defender UI Integration Specification (Contract-Aligned)

**Version:** 2.0 - Backend Contract Aligned  
**Last Updated:** 2024-01-24  
**Purpose:** Frontend-backend integration contract for N-Defender kiosk UI  
**Contract Compliance:** ALL field names, endpoints, and units match backend API exactly

---

## CRITICAL: Backend API Contract Compliance

This specification is **contract-aligned**. The backend API contract is the single source of truth for:
- Endpoint URLs
- Field names
- Data types
- Units of measurement
- Timestamp formats
- Enumeration values

**Any deviation from the backend contract is a BUG.**

---

## 1. Overview

### What the UI Does

N-Defender UI is a touch-first operator console running on a 7" Raspberry Pi kiosk (responsive up to desktop). It provides:

- **Home:** Map-first view with unified contacts drawer (Remote ID markers on map, all contact types in list)
- **Alerts:** Grouped alerts (Active/Acknowledged/Resolved) with quick actions (Ack All, Mute)
- **Logs:** Event stream with time/level filters + CSV/JSON export + Replay mode controls
- **Settings:** System diagnostics, sensor status, map management, AntSDR configuration
- **Contact Details:** Bottom sheet with tabs (Overview/Data/Actions/History)
- **Video Preview:** Full-screen FPV video overlay (triggered from FPV contact actions)

### Critical Operator Promises (Non-Negotiable)

1. **No UI Lying:** Data freshness always visible. Stale data clearly marked. Invalid data not shown as valid.
2. **No Overlap:** Layout works at 360px–1920px without controls overlapping or being unreachable.
3. **Replay Always Obvious:** REPLAY ACTIVE banner visible across all screens. Live-only actions disabled in Replay mode. Source (LIVE/REPLAY) tagged on every contact and log entry.
4. **Dangerous Actions Confirmed:** Stop Scan, Reboot Device require hold-to-confirm (2-3 seconds). Ack/confirmation must come from backend before showing success.
5. **GPS-Dependent Data Gated:** Distance/bearing never shown without valid GPS fix (fix_quality must be valid, hdop acceptable).

---

## 2. Canonical API Endpoints (NON-NEGOTIABLE)

### REST API

**Primary Endpoint:**
```
GET /api/v1/status
```

**Purpose:** Initial page load, periodic health check (every 10s), fallback when WebSocket disconnects

**Legacy Alias:** `/status` exists for backward compatibility but MUST NOT be documented or used in new code.

---

### WebSocket API

**Primary Endpoint:**
```
ws://<host>:<port>/api/v1/ws
```

**Purpose:** Real-time telemetry, contact updates, alerts, logs, replay events

**Legacy Alias:** `/ws` exists for backward compatibility but MUST NOT be documented or used in new code.

---

### UI Implementation Rules

✅ **CORRECT:**
```typescript
const API_BASE = '/api/v1';
fetch(`${API_BASE}/status`);
new WebSocket(`ws://localhost:8080${API_BASE}/ws`);
```

❌ **INCORRECT:**
```typescript
fetch('/status');  // Never use legacy alias
new WebSocket('ws://localhost:8080/ws');  // Never use legacy alias
```

---

## 3. Data Model + UI Data Contracts (Contract-Aligned)

### 3.1 REST /status Snapshot (CONTRACT SOURCE OF TRUTH)

**Endpoint:** `GET /api/v1/status`

**Purpose:** Initial page load, periodic sanity check (every 10s), fallback when WebSocket drops.

**Response Schema:**

```typescript
interface StatusSnapshot {
  timestamp: number; // Unix timestamp (MILLISECONDS, not seconds)
  overall_ok: boolean; // false if any critical component down
  
  system: {
    version: string; // "v1.2.5"
    uptime_seconds: number;
    cpu_temp_celsius: number;
    storage_free_gb: number;
    storage_total_gb: number;
    battery_level_percent: number | null; // null if not battery-powered
    network_status: 'wifi' | 'ethernet' | 'offline';
  };
  
  esp32: {
    status: 'linked' | 'offline';
    rssi_dbm: number | null; // MUST be labeled as dBm if calibrated, "raw" if not
    uptime_seconds: number | null;
  };
  
  gps: {
    mode: number; // 0=no fix, 1=2D, 2=3D, 3=3D+DGPS
    sats: number; // Satellite count (NOT "satellites")
    hdop: number; // Horizontal Dilution of Precision
    fix_quality: 'invalid' | 'valid' | 'dgps' | 'rtk'; // CRITICAL: Gate all geo data on this
    latitude: number | null; // Decimal degrees, null if fix_quality invalid
    longitude: number | null; // Decimal degrees, null if fix_quality invalid
    altitude_m: number | null; // Meters, null if fix_quality invalid
    speed_mps: number | null; // Meters per second (NOT mph, NOT kph)
    heading_deg: number | null; // Degrees (0-360, true north)
  };
  
  remote_id: {
    status: 'active' | 'inactive' | 'error';
    active_contacts: number;
    last_update_ts: number | null; // Unix timestamp (MILLISECONDS)
  };
  
  fpv: {
    scan_state: 'scanning' | 'locked' | 'hold' | 'stopped';
    locked_channels: Array<{
      band: string; // "5.8GHz"
      freq_hz: number; // Frequency in Hertz (e.g., 5860000000 for 5860 MHz)
      rssi_dbm: number; // RSSI in dBm (if calibrated)
    }>;
  };
  
  replay: {
    active: boolean;
    filename: string | null;
    current_time_s: number | null; // seconds from start
    duration_s: number | null;
    speed_multiplier: number | null; // 1.0 = realtime
  };
}
```

**Example Response:**

```json
{
  "timestamp": 1706036400000,
  "overall_ok": true,
  "system": {
    "version": "v1.2.5",
    "uptime_seconds": 302567,
    "cpu_temp_celsius": 48,
    "storage_free_gb": 45.2,
    "storage_total_gb": 64,
    "battery_level_percent": 87,
    "network_status": "wifi"
  },
  "esp32": {
    "status": "linked",
    "rssi_dbm": -45,
    "uptime_seconds": 302567
  },
  "gps": {
    "mode": 3,
    "sats": 12,
    "hdop": 1.2,
    "fix_quality": "valid",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "altitude_m": 52,
    "speed_mps": 2.5,
    "heading_deg": 180
  },
  "remote_id": {
    "status": "active",
    "active_contacts": 2,
    "last_update_ts": 1706036398500
  },
  "fpv": {
    "scan_state": "scanning",
    "locked_channels": [
      { "band": "5.8GHz", "freq_hz": 5860000000, "rssi_dbm": -68 }
    ]
  },
  "replay": {
    "active": false,
    "filename": null,
    "current_time_s": null,
    "duration_s": null,
    "speed_multiplier": null
  }
}
```

---

### 3.2 WebSocket Message Envelope (CONTRACT MANDATORY)

**All WebSocket messages MUST use this exact envelope:**

```typescript
interface WSMessage {
  type: string; // Message type (see below)
  timestamp: number; // Unix timestamp (MILLISECONDS)
  source: 'live' | 'replay'; // CRITICAL: Always included
  data: any; // Type-specific payload
}
```

**UI MUST:**
- Read `timestamp` from envelope (NEVER from data payload)
- Check `source` field to route to liveState or replayState
- Expect first message after connect to be a SNAPSHOT (full state sync)

---

#### Message Types

**TELEMETRY_UPDATE**

**Frequency:** Every 1-2 seconds (live), variable (replay)

**Payload:**
```json
{
  "type": "TELEMETRY_UPDATE",
  "timestamp": 1706036400000,
  "source": "live",
  "data": {
    "esp32_rssi_dbm": -45,
    "cpu_temp_celsius": 48,
    "gps_sats": 12,
    "gps_hdop": 1.2,
    "storage_free_gb": 45.2
  }
}
```

**UI Binding:** Updates TopStatusBar chips, StatusDrawer values

**Staleness:** If no TELEMETRY_UPDATE received for >10s, mark telemetry as stale (red age indicator)

---

**CONTACT_NEW**

**Payload:**
```json
{
  "type": "CONTACT_NEW",
  "timestamp": 1706036400000,
  "source": "live",
  "data": {
    "id": "rid-abc123",
    "type": "REMOTE_ID",
    "severity": "CRITICAL",
    "first_seen_ts": 1706036400000,
    "last_seen_ts": 1706036400000,
    "stale_after_ms": 15000,
    "remote_id": {
      "uas_id": "DJI-M3-78A4B2",
      "operator_id": "OP-12345",
      "model": "DJI Mavic 3",
      "lat": 37.7749,
      "lon": -122.4194,
      "alt_m": 120,
      "speed_mps": 8.5,
      "heading_deg": 142,
      "pilot_lat": 37.7750,
      "pilot_lon": -122.4195,
      "home_lat": 37.7751,
      "home_lon": -122.4196,
      "timestamp": "2024-01-23T14:32:15Z"
    }
  }
}
```

**UI Binding:** Adds contact to ContactsList, triggers alert if critical

**Field Notes:**
- `lat` / `lon` are decimal degrees (NOT `lng`)
- `alt_m` is altitude in meters
- `speed_mps` is meters per second
- `heading_deg` is degrees (0-360, true north)

---

**CONTACT_UPDATE**

**Payload:**
```json
{
  "type": "CONTACT_UPDATE",
  "timestamp": 1706036402000,
  "source": "live",
  "data": {
    "id": "rid-abc123",
    "last_seen_ts": 1706036402000,
    "remote_id": {
      "lat": 37.7750,
      "lon": -122.4195,
      "alt_m": 118
    }
  }
}
```

**UI Binding:** Updates existing contact in list, refreshes last_seen timestamp

---

**CONTACT_LOST**

**Payload:**
```json
{
  "type": "CONTACT_LOST",
  "timestamp": 1706036460000,
  "source": "live",
  "data": {
    "id": "rid-abc123",
    "reason": "TTL_EXPIRED"
  }
}
```

**UI Binding:** Marks contact as LOST (red badge, grayed out) or removes from list (if operator-removed)

---

**ALERT_NEW**

**Payload:**
```json
{
  "type": "ALERT_NEW",
  "timestamp": 1706036400000,
  "source": "live",
  "data": {
    "id": "alert-xyz789",
    "contact_id": "rid-abc123",
    "severity": "CRITICAL",
    "title": "Critical: New Remote ID Contact",
    "message": "DJI Mavic 3 detected at 245m",
    "status": "active"
  }
}
```

**UI Binding:** Adds to AlertsList (Active section), shows GlobalCriticalBanner if severity=CRITICAL

---

**ALERT_UPDATE**

**Payload:**
```json
{
  "type": "ALERT_UPDATE",
  "timestamp": 1706036410000,
  "source": "live",
  "data": {
    "id": "alert-xyz789",
    "status": "acknowledged"
  }
}
```

**UI Binding:** Moves alert to Acknowledged/Resolved section

---

**LOG_EVENT**

**Payload:**
```json
{
  "type": "LOG_EVENT",
  "timestamp": 1706036400000,
  "source": "live",
  "data": {
    "id": "log-123",
    "level": "info",
    "source_component": "FPV_SCANNER",
    "message": "Channel scan completed, 3 signals detected",
    "tags": ["scan", "system"]
  }
}
```

**UI Binding:** Appends to LogsList, updates error/warning counts

---

**REPLAY_STATE**

**Payload:**
```json
{
  "type": "REPLAY_STATE",
  "timestamp": 1706036400000,
  "source": "replay",
  "data": {
    "active": true,
    "filename": "capture_20240123_143215.pcap",
    "current_time_s": 123.45,
    "duration_s": 3607,
    "speed_multiplier": 2.0,
    "is_playing": true,
    "loop_enabled": false,
    "file_metadata": {
      "start_ts": 1706036000000,
      "end_ts": 1706039607000,
      "total_events": 3247,
      "event_counts": {
        "BasicID": 892,
        "Location": 1024,
        "System": 453,
        "OperatorID": 178
      },
      "sha256": "a3f2e9d4c1b8..."
    }
  }
}
```

**UI Binding:** Updates ReplayPanel state, shows/updates ReplayActiveBanner

---

**ERROR_EVENT**

**Payload:**
```json
{
  "type": "ERROR_EVENT",
  "timestamp": 1706036400000,
  "source": "live",
  "data": {
    "severity": "error",
    "component": "ESP32_LINK",
    "message": "Connection lost, attempting reconnect",
    "retry_count": 3,
    "user_action_required": false
  }
}
```

**UI Binding:** Shows toast notification, logs to LogsList

---

### 3.3 Contacts Model (CONTRACT-ALIGNED)

**TypeScript Interface:**

```typescript
interface Contact {
  // Core (always present)
  id: string; // Stable identifier
  type: 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  source: 'live' | 'replay'; // From WS message envelope
  first_seen_ts: number; // Unix timestamp (MILLISECONDS)
  last_seen_ts: number; // Unix timestamp (MILLISECONDS)
  stale_after_ms: number; // TTL hint from backend
  
  // Optional (metadata)
  is_pinned?: boolean;
  tags?: string[];
  notes?: string;
  
  // Type-specific payloads (only one present based on type)
  remote_id?: RemoteIDPayload;
  fpv_link?: FPVLinkPayload;
  unknown_rf?: UnknownRFPayload;
}

interface RemoteIDPayload {
  uas_id: string; // Serial/ID
  operator_id?: string;
  model?: string; // "DJI Mavic 3"
  
  // Position (drone) - CONTRACT FIELD NAMES
  lat: number; // Decimal degrees (NOT lng)
  lon: number; // Decimal degrees (NOT lng)
  alt_m: number; // Altitude in meters
  
  // Motion - CONTRACT UNITS
  speed_mps?: number; // Meters per second (NOT kph, NOT mph)
  heading_deg?: number; // Degrees 0-360, true north
  
  // Operator/Home (optional) - CONTRACT FIELD NAMES
  pilot_lat?: number; // Decimal degrees
  pilot_lon?: number; // Decimal degrees
  home_lat?: number; // Decimal degrees
  home_lon?: number; // Decimal degrees
  
  // Metadata
  timestamp: string; // ISO8601 from drone
  validation_status: 'valid' | 'checksum_fail' | 'incomplete';
}

interface FPVLinkPayload {
  band: string; // "5.8GHz"
  freq_hz: number; // Frequency in Hertz (NOT MHz)
  rssi_dbm: number; // RSSI in dBm (if calibrated)
  lock_state: 'locked' | 'scanning' | 'hold';
  scan_state?: 'active' | 'paused';
  threshold_preset?: string; // "Balanced" | "Critical Focus"
  hit_count?: number; // Detections since first seen
}

interface UnknownRFPayload {
  signal_strength_percent?: number;
  frequency_range?: string; // "2.4GHz" (if identifiable)
}
```

**Derived Fields (Computed Client-Side with GPS Gating):**

```typescript
interface ContactDerived {
  age_ms: number; // Date.now() - last_seen_ts
  is_stale: boolean; // age_ms > stale_after_ms
  is_lost: boolean; // age_ms > 60000
  
  // ONLY for Remote ID with VALID GPS fix
  distance_m?: number; // Calculated from user's GPS + drone lat/lon
  bearing_deg?: number; // Calculated bearing (0-360, true north)
}
```

**GPS Gating Rules (MANDATORY):**

```typescript
function canShowDerivedGeo(contact: Contact, gpsStatus: GPSStatus): boolean {
  return (
    contact.type === 'REMOTE_ID' &&
    gpsStatus.fix_quality === 'valid' && // CRITICAL: Check fix_quality
    gpsStatus.hdop < 5.0 && // Reasonable HDOP threshold
    contact.remote_id?.lat !== undefined &&
    contact.remote_id?.lon !== undefined &&
    gpsStatus.latitude !== null &&
    gpsStatus.longitude !== null
  );
}

// UI MUST display "—" or "GPS fix required" if gating fails
```

---

### 3.4 Unit Display Conversions (UI Presentation Layer Only)

**Backend provides data in contract units. UI may convert ONLY for display:**

| Backend Field | Contract Unit | UI Display Conversion | Label |
|---------------|---------------|----------------------|-------|
| `speed_mps` | meters/second | `speed_mps * 3.6` | "12.5 km/h" or "7.8 mph" |
| `freq_hz` | Hertz | `freq_hz / 1e6` | "5860 MHz" |
| `alt_m` | meters | `alt_m * 3.281` | "394 ft" (optional) |
| `heading_deg` | degrees | Direct | "180°" or "S" |
| `rssi_dbm` | dBm | Direct | "-68 dBm" |

**CRITICAL:** NEVER store converted values. Always store contract units.

---

## 4. Component → Data Binding Map (Contract-Aligned)

| UI Component | Data Source | Fields Used | Refresh Policy | Stale Threshold | GPS Gating |
|--------------|-------------|-------------|----------------|-----------------|------------|
| **TopStatusBar** | `GET /api/v1/status` + WS `TELEMETRY_UPDATE` | `esp32.status`, `fpv.scan_state`, `gps.fix_quality` | Initial + every 1-2s | >10s: red | N/A |
| **GPS Accuracy (HUD)** | `GET /api/v1/status` + WS | `gps.hdop`, `gps.sats`, `gps.fix_quality` | Every 1-2s | >5s: amber | Always show quality |
| **ContactsList** | WS `CONTACT_NEW/UPDATE/LOST` | Full contact objects | Real-time | Per-contact TTL | N/A |
| **ContactCard Distance** | Derived client-side | `remote_id.lat/lon` + `gps.latitude/longitude` | On contact update | N/A | **REQUIRED** |
| **Map Markers** | WS `CONTACT_*` (Remote ID only) | `remote_id.lat/lon` | Real-time | Fade >TTL | **REQUIRED** |
| **AlertsList** | WS `ALERT_NEW/UPDATE` | Alert objects | Real-time | Alerts don't stale | N/A |
| **LogsList** | WS `LOG_EVENT` | Log objects | Real-time | Logs don't stale | N/A |
| **ReplayPanel** | WS `REPLAY_STATE` | Replay state | Real-time | N/A | N/A |
| **System Status** | `GET /api/v1/status` | `system.*` | Every 10s | >15s: show age | N/A |

---

## 5. Anti-"UI Lying" Guardrails (CONTRACT ENFORCEMENT)

### 5.1 Freshness + Stale Indicators

**Thresholds (in milliseconds):**

```typescript
const STALE_THRESHOLDS = {
  // Telemetry
  telemetry_warning: 5000,    // 5s: Amber color
  telemetry_critical: 10000,  // 10s: Red color + pulsing icon
  
  // GPS
  gps_warning: 5000,          // 5s: Amber accuracy indicator
  gps_critical: 15000,        // 15s: Red "GPS STALE" warning
  
  // Contacts (per-contact TTL from backend)
  contact_stale: (contact) => contact.stale_after_ms, // Backend-provided
  contact_lost: 60000,        // 60s: Always red "LOST"
  
  // WebSocket
  ws_disconnect_warning: 3000,  // 3s: Show "Reconnecting..." toast
  ws_disconnect_critical: 10000 // 10s: Show "Disconnected" banner + disable actions
};
```

**Visual Requirements:**

**GPS Status Display (MANDATORY):**
- **No Fix (`fix_quality === 'invalid'`):** Gray "No GPS Fix", DO NOT show lat/lon/distance/bearing
- **Valid (`fix_quality === 'valid'`):** Show HDOP: "±1.2m" (green if <2m, amber if 2-5m, red if >5m)
- **DGPS/RTK (`fix_quality === 'dgps' | 'rtk'`):** Show "DGPS" or "RTK" badge

**Contact Cards:**
- **Fresh (< TTL):** Normal display
- **Stale (TTL–60s):** Amber "STALE" badge, amber left stripe, "Last seen 45s ago"
- **Lost (>60s):** Red "LOST" badge, red left stripe, grayed-out content (opacity 0.6), "Last seen 2m ago"
- **Distance/Bearing:** Show "—" or "GPS fix required" if GPS gating fails

**Mandatory Age Displays:**
- Contact cards: "30s ago" (top-right)
- Telemetry values: "Updated 2s ago" (inline, small text)
- Alerts: "5m ago" (relative time, auto-updates)

---

### 5.2 Source Tagging (REPLAY SAFETY)

**Rule:** Every data item with a `source` field MUST display it visually.

**Contact Cards:**
- Top-right corner badge: "LIVE" (green bg, 10px font) or "REPLAY" (amber bg)
- ALWAYS visible, NEVER omitted

**Log Rows:**
- Right corner badge: "LIVE" (green) or "REPLAY" (amber)

**Replay Mode Global Indicators (WHEN `replay.active === true`):**

1. **ReplayActiveBanner (top of screen):**
   - Background: amber-600
   - Text: "REPLAY MODE • filename.pcap • 00:12:34" (uppercase, white)
   - "Exit Replay" button (right, white, rounded)
   - Z-index: 45 (always visible, never covered)
   - Position: Below critical alert banner (if both present)

2. **Map Watermark:**
   - Semi-transparent "REPLAY" text (large, diagonal, centered over map)
   - Opacity: 0.15, white color

3. **Disabled Actions:**
   - Stop Scan: Grayed out, tooltip: "Scan disabled during Replay"
   - Lock Strongest: Grayed out, tooltip: "Not available during Replay"
   - All live control buttons show "Disabled during Replay" on hover

4. **State Isolation:**
   - Replay contacts stored in `replayState.contacts`
   - Live contacts stored in `liveState.contacts`
   - NEVER merge or cross-contaminate
   - Switching to Live mode clears replay state completely

---

### 5.3 GPS-Dependent Data Gating (ABSOLUTE RULE)

**Rule:** Distance and bearing MUST NOT be displayed unless ALL conditions met:

```typescript
// MANDATORY gating function
function canShowDistance(contact: Contact, gpsStatus: GPSStatus): boolean {
  return (
    contact.type === 'REMOTE_ID' &&
    gpsStatus.fix_quality === 'valid' && // CRITICAL
    gpsStatus.hdop !== null &&
    gpsStatus.hdop < 5.0 && // Reasonable threshold
    contact.remote_id?.lat !== undefined &&
    contact.remote_id?.lon !== undefined &&
    gpsStatus.latitude !== null &&
    gpsStatus.longitude !== null
  );
}

// UI implementation
const showDistance = canShowDistance(contact, gpsStatus);
return (
  <div>
    {showDistance ? (
      <span>{distance_m.toFixed(0)}m · {bearing_deg}°</span>
    ) : (
      <span className="text-slate-500">GPS fix required</span>
    )}
  </div>
);
```

**Map Controls Gating:**
- "Center on Me" button: Disabled if `fix_quality !== 'valid'`
- "Focus Selected Contact" button: Disabled if GPS gating fails
- Tooltip on disabled controls: "Requires valid GPS fix"

---

### 5.4 Field Naming Validation (CONTRACT COMPLIANCE)

**NEVER use these field names in UI code:**

❌ **FORBIDDEN:**
- `lng` (use `lon` or `longitude`)
- `long` (use `lon` or `longitude`)
- `rssi` (use `rssi_dbm` and label appropriately)
- `freq` (use `freq_hz`)
- `speed` (use `speed_mps`)
- `heading` (use `heading_deg`)
- `altitude` (use `alt_m`)
- `distance` (use `distance_m`)
- `bearing` (use `bearing_deg`)
- Seconds-based timestamps (use milliseconds)

✅ **CORRECT (Contract Field Names):**
- `latitude` / `lat`
- `longitude` / `lon`
- `rssi_dbm`
- `freq_hz`
- `speed_mps`
- `heading_deg`
- `alt_m`
- `distance_m` (derived)
- `bearing_deg` (derived)
- Millisecond timestamps

**Validation:**
```typescript
// Code review checklist
// ❌ BAD
const marker = { lat: data.lat, lng: data.lon }; // NEVER use lng

// ✅ GOOD
const marker = { lat: data.lat, lon: data.lon };
```

---

### 5.5 RSSI Labeling (HONESTY REQUIREMENT)

**Rule:** RSSI values MUST be labeled honestly based on calibration status.

**If rssi_dbm is calibrated:**
```typescript
<span className="text-slate-300">RSSI: {rssi_dbm} dBm</span>
```

**If rssi_dbm is raw ADC value (uncalibrated):**
```typescript
<span className="text-slate-300">Signal: {rssi_dbm} (raw)</span>
// OR
<span className="text-slate-300">Signal Strength: {rssi_dbm}</span>
```

**NEVER label raw ADC values as "dBm" - this is lying to the operator.**

---

## 6. Binding Rules: REST vs WebSocket (Contract Usage)

| UI Widget | REST `/api/v1/status` | WebSocket `/api/v1/ws` | Refresh Policy | Stale Policy | Fallback |
|-----------|----------------------|----------------------|----------------|--------------|----------|
| **TopStatusBar chips** | Initial load | `TELEMETRY_UPDATE` | Every 1-2s (WS) | Red if no update >10s | Show last known + age |
| **GPS Accuracy (HUD)** | Initial load | `TELEMETRY_UPDATE` | Every 1-2s (WS) | Amber if no update >5s | Show last known + age |
| **ContactsList** | - | `CONTACT_NEW/UPDATE/LOST` | Real-time (WS) | Amber badge if age > TTL, red if >60s | Empty state if WS down >30s |
| **AlertsList** | - | `ALERT_NEW/UPDATE` | Real-time (WS) | N/A (alerts don't stale) | Show cached + disconnected banner |
| **LogsList** | - | `LOG_EVENT` | Real-time (WS) | N/A | Show cached + disconnected banner |
| **System Status** | Initial load | `TELEMETRY_UPDATE` | Snapshot every 10s (REST) | Show age if >15s | Show last known + "Updating..." |
| **Replay Panel** | Initial load | `REPLAY_STATE` | Real-time (WS) | N/A | Pause playback if WS drops |
| **Map Markers** | - | `CONTACT_*` (RemoteID only) | Real-time (WS) | Fade out if >TTL | Remove if >60s |

### REST `/api/v1/status` Usage

**When to Call:**
1. **Page Load:** Fetch immediately on app init
2. **Periodic Sanity Check:** Every 10 seconds (even if WS connected)
3. **WS Reconnect:** After WS reconnects, reconcile state
4. **User Pull-to-Refresh:** If implemented (future)

**Reconciliation Logic:**
When REST snapshot arrives, compare with WS-derived state:
- If `replay.active` differs: Hard reload (something went wrong)
- If `esp32.status` differs: Trust REST (WS might be lagging)
- If contact counts differ significantly (>10): Log warning, trust REST

### WebSocket `/api/v1/ws` Usage

**When to Connect:**
- On page load, immediately after REST `/api/v1/status` completes
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)

**Message Processing:**
- All messages update a central state store
- `source` field routes data to `liveState` or `replayState`
- UI reads from active source based on mode
- First message after connect is SNAPSHOT (full state sync)

**Disconnect Handling:**
- Show "Disconnected" toast (orange, persistent)
- Mark all telemetry as stale (red age indicators)
- Disable real-time actions (Lock Strongest, etc.)
- Attempt reconnect with backoff
- On reconnect: Fetch REST `/api/v1/status`, reconcile, resume

---

## 7. Contract Validation Checklist (BLOCKING ISSUES)

### ✅ Endpoint Compliance

- [ ] All REST calls use `/api/v1/status` (not `/status`)
- [ ] All WebSocket connections use `/api/v1/ws` (not `/ws`)
- [ ] No legacy endpoints documented or referenced

### ✅ Field Naming Compliance

- [ ] Zero uses of `lng` anywhere in code or docs
- [ ] Zero uses of `long` anywhere in code or docs
- [ ] All latitude fields use `latitude` or `lat`
- [ ] All longitude fields use `longitude` or `lon`
- [ ] All GPS fields match contract: `sats`, `hdop`, `fix_quality`, `latitude`, `longitude`, `altitude_m`, `speed_mps`, `heading_deg`
- [ ] All Remote ID fields match contract: `lat`, `lon`, `alt_m`, `speed_mps`, `heading_deg`
- [ ] All derived fields use contract units: `distance_m`, `bearing_deg`

### ✅ Unit Compliance

- [ ] All speeds stored/transmitted as `speed_mps` (meters/second)
- [ ] All headings stored/transmitted as `heading_deg` (degrees)
- [ ] All frequencies stored/transmitted as `freq_hz` (Hertz)
- [ ] All RSSI values labeled as `rssi_dbm` (with honesty check)
- [ ] All timestamps are milliseconds (not seconds)
- [ ] All altitudes use `alt_m` (meters)
- [ ] UI display conversions happen ONLY in presentation layer

### ✅ GPS Gating Compliance

- [ ] Distance NEVER shown without valid GPS fix
- [ ] Bearing NEVER shown without valid GPS fix
- [ ] Map "Center on Me" disabled without valid GPS fix
- [ ] GPS status shows `fix_quality` not just satellite count
- [ ] HDOP displayed in diagnostics
- [ ] UI shows "GPS fix required" when gating fails

### ✅ Replay Safety Compliance

- [ ] REPLAY ACTIVE banner visible when `replay.active === true`
- [ ] All contacts/logs show source badge (LIVE/REPLAY)
- [ ] Live and Replay state strictly isolated
- [ ] Live-only actions disabled during Replay
- [ ] Exit Replay button always visible in Replay mode

### ✅ Timestamp Compliance

- [ ] All timestamps stored as milliseconds
- [ ] All time math uses milliseconds
- [ ] Display formatting converts ms → human-readable
- [ ] No mixing of seconds and milliseconds

### ✅ RSSI Labeling Compliance

- [ ] RSSI labeled as "dBm" only if calibrated
- [ ] Raw ADC values labeled as "raw" or "signal strength"
- [ ] No false precision claims

---

## 8. BLOCKING ISSUES (Must Fix Before Integration)

If ANY of these conditions are true, integration is BLOCKED:

### CRITICAL BLOCKERS

1. ❌ **Using `/status` or `/ws` endpoints** → MUST use `/api/v1/*`
2. ❌ **Using `lng` anywhere** → MUST use `lon` or `longitude`
3. ❌ **Showing distance/bearing without GPS gating** → MUST implement gating function
4. ❌ **Mixing live and replay state** → MUST isolate completely
5. ❌ **Timestamps in seconds** → MUST use milliseconds
6. ❌ **Field names don't match contract** → MUST align exactly

### MAJOR BLOCKERS

7. ❌ **No REPLAY ACTIVE banner** → MUST be visible across all screens
8. ❌ **No source badges on contacts/logs** → MUST show LIVE/REPLAY
9. ❌ **RSSI mislabeled as dBm when raw** → MUST label honestly
10. ❌ **Frequency in MHz instead of Hz** → MUST store as Hz, convert for display only

---

## 9. Implementation Notes (Contract-Aligned)

### State Store Shape (Contract-Aligned)

```typescript
interface AppState {
  // Connection
  wsConnected: boolean;
  wsReconnecting: boolean;
  lastTelemetryUpdate: number; // Milliseconds timestamp
  
  // Mode
  activeMode: 'live' | 'replay';
  
  // Live State
  liveState: {
    telemetry: {
      esp32_rssi_dbm: number | null;
      cpu_temp_celsius: number;
      gps_sats: number;
      gps_hdop: number;
      gps_fix_quality: 'invalid' | 'valid' | 'dgps' | 'rtk';
      gps_latitude: number | null;
      gps_longitude: number | null;
      storage_free_gb: number;
    };
    contacts: Map<string, Contact>; // Keyed by id
    alerts: Map<string, Alert>;
    logs: Log[];
  };
  
  // Replay State (ISOLATED from live)
  replayState: {
    filename: string | null;
    metadata: ReplayMetadata | null;
    currentTime: number; // seconds
    duration: number;
    isPlaying: boolean;
    speed: number;
    loopEnabled: boolean;
    contacts: Map<string, Contact>; // Replay contacts (NEVER mixed with live)
    logs: Log[]; // Replay logs (NEVER mixed with live)
  };
  
  // UI State
  ui: {
    activeTab: 'home' | 'alerts' | 'logs' | 'settings';
    selectedContactId: string | null;
    contactSheetOpen: boolean;
    statusDrawerOpen: boolean;
    videoPreviewOpen: boolean;
    panicControlsCollapsed: boolean;
  };
}
```

### GPS Gating Helper (MANDATORY)

```typescript
/**
 * Determines if GPS-derived geo data can be shown
 * MUST be used before displaying distance/bearing
 */
function canShowDerivedGeo(
  contact: Contact,
  gps: {
    fix_quality: string;
    hdop: number | null;
    latitude: number | null;
    longitude: number | null;
  }
): boolean {
  return (
    contact.type === 'REMOTE_ID' &&
    gps.fix_quality === 'valid' &&
    gps.hdop !== null &&
    gps.hdop < 5.0 &&
    contact.remote_id?.lat !== undefined &&
    contact.remote_id?.lon !== undefined &&
    gps.latitude !== null &&
    gps.longitude !== null
  );
}
```

### Unit Conversion Helpers (Display Only)

```typescript
/**
 * Convert frequency from Hz to MHz for display
 * Backend stores freq_hz, UI can show MHz
 */
function displayFrequency(freq_hz: number): string {
  return `${(freq_hz / 1e6).toFixed(0)} MHz`;
}

/**
 * Convert speed from m/s to km/h for display
 * Backend stores speed_mps, UI can show km/h or mph
 */
function displaySpeed(speed_mps: number, unit: 'kmh' | 'mph' = 'kmh'): string {
  if (unit === 'kmh') {
    return `${(speed_mps * 3.6).toFixed(1)} km/h`;
  } else {
    return `${(speed_mps * 2.237).toFixed(1)} mph`;
  }
}

/**
 * NEVER store converted values - always store contract units
 */
```

---

## 10. Ready for Integration Checklist

### Contract Alignment (ALL MUST PASS)

- [ ] **Endpoints:** All REST calls use `/api/v1/status`, all WS use `/api/v1/ws`
- [ ] **Field Names:** Zero uses of `lng`, all geo fields match contract
- [ ] **Units:** All speeds in `mps`, headings in `deg`, frequencies in `hz`, RSSI in `dbm`
- [ ] **Timestamps:** All timestamps are milliseconds
- [ ] **GPS Gating:** Distance/bearing gated on `fix_quality === 'valid'`
- [ ] **Replay Isolation:** Live and Replay state completely isolated
- [ ] **Source Tagging:** All contacts/logs show LIVE/REPLAY badge
- [ ] **RSSI Labeling:** Honest labeling (dBm vs raw)

### UI Safety (ALL MUST PASS)

- [ ] **REPLAY ACTIVE banner:** Visible across all screens when active
- [ ] **Live actions disabled:** Stop Scan, Lock Strongest grayed out during Replay
- [ ] **Exit Replay:** Button always visible in Replay mode
- [ ] **Stale indicators:** Show age on all telemetry/contacts
- [ ] **Empty states:** Helpful messages when no data
- [ ] **Error states:** Retry buttons on failures

### Performance (ALL MUST PASS)

- [ ] **Initial load:** <2s on Raspberry Pi
- [ ] **Smooth scrolling:** 60fps on large lists (use virtualization)
- [ ] **WS reconnect:** Auto-reconnect with exponential backoff
- [ ] **No memory leaks:** Verified with 10min runtime test

---

## END OF CONTRACT-ALIGNED SPECIFICATION

**This specification is now aligned with the backend API contract.**

**Any deviation from field names, endpoints, units, or gating rules is a bug that MUST be fixed before production.**

**Backend API contract is the SINGLE SOURCE OF TRUTH.**
