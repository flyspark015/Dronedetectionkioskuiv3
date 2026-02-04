# N-Defender UI Data Binding Map

**SOURCE OF TRUTH:**
- Data contract: `contracts.ts` + `schema.json`
- UX & behavior rules: `spces.md`
- Integration rules: `data-binding-map.md` (this file)

**Last Updated:** 2026-01-26

**Status:** ✅ Canonical Data Binding Specification

---

## 1. OVERVIEW

This document maps **UI components** to **backend API fields**.

Every UI widget must reference this document to ensure correct field naming and units.

---

## 2. REST API BINDINGS

### 2.1 Endpoint

```
GET /api/v1/status
```

### 2.2 Response Structure

```typescript
interface StatusSnapshot {
  timestamp: number;          // ✅ Milliseconds
  gps: GPSStatus;
  esp32: ESP32Status;
  fpv_scanner: FPVScannerStatus;
  remote_id: RemoteIdStatus;
  system: SystemStatus;
}
```

### 2.3 StatusBar Widget Bindings

| UI Element | Backend Field | Transform | Display |
|------------|---------------|-----------|---------|
| ESP32 Badge | `status.esp32.state` | None | "Connected" / "Disconnected" |
| FPV State Badge | `status.fpv_scanner.state` | Uppercase | "SCANNING" / "LOCKED" / "HOLD" / "STOPPED" |
| GPS Quality Icon | `status.gps.fix_quality` | Quality → Color | Red (0), Amber (1), Green (2) |
| Storage | `status.system.storage_free_gb` | Round 1 decimal | "64.5 GB" |
| Telemetry Age | `Date.now() - status.timestamp` | ms → seconds | "2.5s" |

### 2.4 GPS Status Bindings

| UI Element | Backend Field | Transform | GPS-Gated |
|------------|---------------|-----------|-----------|
| Latitude | `status.gps.latitude` | Format 6 decimals | No |
| Longitude | `status.gps.longitude` | Format 6 decimals | No |
| Altitude | `status.gps.alt_m` | Integer + "m" | No |
| Speed | `status.gps.speed_mps` | × 3.6 → km/h | No |
| Heading | `status.gps.heading_deg` | Integer + "°" | No |
| Fix Quality | `status.gps.fix_quality` | Enum → Label | No |
| HDOP | `status.gps.hdop` | Format 1 decimal | No |
| Satellites | `status.gps.sats` | Integer | No |

**GPS Validity Check:**
```typescript
const hasValidGPS = status.gps.fix_quality >= 2;
```

---

## 3. WEBSOCKET BINDINGS

### 3.1 Endpoint

```
ws://<host>:<port>/api/v1/ws
wss://<host>:<port>/api/v1/ws  // HTTPS
```

### 3.2 Envelope Structure (MANDATORY)

```typescript
interface WebSocketEnvelope {
  type: string;               // Event type
  timestamp: number;          // ✅ Milliseconds
  source: 'live' | 'replay';  // Data source
  data: any;                  // Event payload
}
```

### 3.3 Event Types

| Event Type | UI Action | Data Structure |
|------------|-----------|----------------|
| `TELEMETRY_UPDATE` | Update StatusBar, MapHUD | Partial<StatusSnapshot> |
| `CONTACT_NEW` | Add to contacts list | Contact |
| `CONTACT_UPDATE` | Update existing contact | Partial<Contact> & {id} |
| `CONTACT_LOST` | Mark as lost | {id: string} |
| `REPLAY_STATE` | Show/hide REPLAY banner | {is_replaying: boolean} |

### 3.4 CONTACT_NEW Event Binding

**Event Structure:**
```json
{
  "type": "CONTACT_NEW",
  "timestamp": 1700000000000,
  "source": "live",
  "data": {
    "id": "rid-001",
    "type": "REMOTE_ID",
    "last_seen_ts": 1700000000000,
    "first_seen_ts": 1699999000000,
    "source": "live",
    "severity": "critical",
    "remote_id": {
      "model": "DJI Mavic 3",
      "serial_id": "DJI-123456",
      "drone_coords": {
        "lat": 37.7749,
        "lon": -122.4194,
        "alt_m": 120
      }
    }
  }
}
```

**UI Processing:**
```typescript
ws.onmessage = (event) => {
  const envelope = JSON.parse(event.data);
  const { type, timestamp, source, data } = envelope;
  
  if (type === 'CONTACT_NEW') {
    const contact = { ...data, source };  // ✅ Add source from envelope
    addContact(contact);
  }
};
```

---

## 4. CONTACT CARD BINDINGS

### 4.1 Remote ID Contact

| UI Element | Backend Field | Transform | GPS-Gated |
|------------|---------------|-----------|-----------|
| Type Badge | `contact.type` | "REMOTE_ID" → "Remote ID" | No |
| Source Badge | `contact.source` | "replay" → "REPLAY" badge | No |
| Model | `contact.remote_id.model` | None | No |
| Serial ID | `contact.remote_id.serial_id` | None | No |
| Distance | `contact.derived.distance_m` | Integer + "m" | ✅ Yes |
| Bearing | `contact.derived.bearing_deg` | Integer + "°" | ✅ Yes |
| Last Seen | `contact.last_seen_ts` | ms → "Xs ago" | No |
| Stale Badge | `Date.now() - contact.last_seen_ts` | Age → Badge | No |

**GPS Gating for Distance/Bearing:**
```typescript
{hasValidGPS && contact.derived?.distance_m !== undefined ? (
  <span>{contact.derived.distance_m}m · {contact.derived.bearing_deg}°</span>
) : (
  <span className="text-slate-500">GPS fix required</span>
)}
```

### 4.2 FPV Link Contact

| UI Element | Backend Field | Transform | Notes |
|------------|---------------|-----------|-------|
| Type Badge | `contact.type` | "FPV_LINK" → "FPV Link" | |
| Frequency | `contact.fpv_link.freq_hz` | ÷ 1e6 → "5860 MHz" | ✅ Hz to MHz |
| RSSI | `contact.fpv_link.rssi_dbm` | None + " dBm" | ✅ Calibrated |
| Lock State | `contact.fpv_link.lock_state` | Uppercase | |
| Band | `contact.fpv_link.band` | None | |

**Frequency Conversion:**
```typescript
const freqMHz = (contact.fpv_link.freq_hz / 1_000_000).toFixed(0);
return <span>{freqMHz} MHz</span>;
```

### 4.3 Stale Detection

```typescript
const age_ms = Date.now() - contact.last_seen_ts;
const isStale = age_ms >= 15_000 && age_ms < 60_000;
const isLost = age_ms >= 60_000;
```

**Visual States:**
- ACTIVE: Normal (age < 15s)
- STALE: Amber border + badge (15s ≤ age < 60s)
- LOST: Gray 60% + badge (age ≥ 60s)

---

## 5. MAP MARKER BINDINGS

### 5.1 Remote ID Markers

**Plot Condition:**
```typescript
const shouldPlot = 
  contact.type === 'REMOTE_ID' &&
  contact.remote_id?.drone_coords?.lat !== undefined &&
  contact.remote_id?.drone_coords?.lon !== undefined;
```

**Marker Position:**
```typescript
const position = [
  contact.remote_id.drone_coords.lat,   // ✅ lat (NOT latitude)
  contact.remote_id.drone_coords.lon    // ✅ lon (NOT lng)
];
```

### 5.2 User Location Marker

**Plot Condition (GPS-Gated):**
```typescript
const shouldPlotUser = hasValidGPS(gps);  // fix_quality >= 2
```

**Marker Position:**
```typescript
const position = [
  gps.latitude,   // ✅ latitude (NOT lat)
  gps.longitude   // ✅ longitude (NOT lng)
];
```

### 5.3 FPV/Unknown Contacts

**❌ NEVER plot FPV or Unknown contacts on map (list-only)**

---

## 6. FIELD NAME QUICK REFERENCE

### GPS Fields (from /api/v1/status)

| ✅ CORRECT | ❌ WRONG |
|-----------|---------|
| `gps.latitude` | `gps.lat` |
| `gps.longitude` | `gps.lng` |
| `gps.speed_mps` | `gps.speed` |
| `gps.heading_deg` | `gps.heading` |
| `gps.alt_m` | `gps.altitude` |
| `gps.fix_quality` | `gps.fix` |
| `gps.hdop` | `gps.accuracy` |
| `gps.sats` | `gps.satellites` |

### Remote ID Fields (from WebSocket)

| ✅ CORRECT | ❌ WRONG |
|-----------|---------|
| `drone_coords.lat` | `drone_coords.latitude` |
| `drone_coords.lon` | `drone_coords.lng` |
| `pilot_coords.lon` | `pilot_coords.lng` |
| `home_coords.lon` | `home_coords.lng` |
| `serial_id` | `serialId` |

### FPV Fields (from WebSocket)

| ✅ CORRECT | ❌ WRONG |
|-----------|---------|
| `fpv_link.freq_hz` | `fpv_link.freq_mhz` |
| `fpv_link.rssi_dbm` | `fpv_link.rssi` |
| `fpv_link.lock_state` | `fpv_link.state` |

### Timestamps (ALL)

| ✅ CORRECT | ❌ WRONG |
|-----------|---------|
| `last_seen_ts` (ms) | `lastSeen` (Date) |
| `first_seen_ts` (ms) | `firstSeen` (Date) |
| `timestamp` (ms) | `timestamp` (seconds) |

---

## 7. UNITS CONVERSION TABLE

| Field | Contract Unit | Display Conversion | Example |
|-------|---------------|-------------------|---------|
| Frequency | `freq_hz` (Hz) | `÷ 1e6` | "5860 MHz" |
| Speed | `speed_mps` (m/s) | `× 3.6` | "18 km/h" |
| Altitude | `alt_m` (m) | `× 3.28084` | "394 ft" (optional) |
| Distance | `distance_m` (m) | `÷ 1000` if >1000 | "1.2 km" |
| Heading | `heading_deg` (°) | None | "245°" or "SW" |
| RSSI | `rssi_dbm` (dBm) | None | "-68 dBm" |

---

## 8. GPS GATING IMPLEMENTATION

### Rule (LOCKED)

```typescript
const hasValidGPS = gps.fix_quality >= 2;
```

### UI Elements Requiring GPS Gating

| Element | Condition | Shown When | Hidden/Disabled When |
|---------|-----------|------------|---------------------|
| Distance | GPS-gated | `hasValidGPS && distance_m !== undefined` | "GPS fix required" |
| Bearing | GPS-gated | `hasValidGPS && bearing_deg !== undefined` | "GPS fix required" |
| User Location | GPS-gated | `hasValidGPS` | Hidden |
| "Center on Me" | GPS-gated | `hasValidGPS` | Disabled + tooltip |

### Code Example

```typescript
// ✅ CORRECT
function ContactCard({ contact, gps }: Props) {
  const hasValidGPS = gps.fix_quality >= 2;
  
  return (
    <div>
      {hasValidGPS && contact.derived?.distance_m !== undefined ? (
        <span>{contact.derived.distance_m}m · {contact.derived.bearing_deg}°</span>
      ) : (
        <span className="text-slate-500">GPS fix required</span>
      )}
    </div>
  );
}

// ❌ WRONG
function ContactCard({ contact }: Props) {
  return (
    <div>
      {contact.derived?.distance_m && (
        <span>{contact.derived.distance_m}m</span>
      )}
    </div>
  );
}
```

---

## 9. REPLAY MODE BINDINGS

### Detection

```typescript
const isReplayMode = contact.source === 'replay';
// OR
const isReplayMode = envelope.source === 'replay';
// OR from REPLAY_STATE event
const isReplayMode = replayState.is_replaying;
```

### UI Requirements

| Element | Requirement |
|---------|-------------|
| Global Banner | Show "REPLAY ACTIVE — Not Live Data" when replay |
| Contact Badge | ALL contacts show "REPLAY" badge when `source === 'replay'` |
| Live Actions | Disable "Start Scan", "Lock Target" when replay |
| Map Watermark | Show "REPLAY" text in corner when replay |

---

## 10. WEBSOCKET DISCONNECT HANDLING

### Detection

```typescript
ws.onclose = () => {
  setIsConnected(false);
  setDisconnectedAt(Date.now());
};
```

### UI Behavior

| Element | Behavior When Disconnected |
|---------|---------------------------|
| StatusBar | Show "Disconnected" badge (red) |
| Telemetry Age | Show "Last updated Xs ago" (red) |
| Contacts | Gray out all (80% opacity) |
| Map Markers | Keep last positions, add pulsing outline |
| Banner | Show "Disconnected — Showing last known data" |

---

## 11. INTEGRATION CHECKLIST REFERENCE

Before declaring integration complete, verify all bindings:

- [ ] StatusBar uses `gps.latitude`/`gps.longitude` (NOT `lat`/`lng`)
- [ ] Remote ID uses `drone_coords.lat`/`drone_coords.lon` (NOT `lng`)
- [ ] FPV uses `freq_hz` and converts to MHz for display
- [ ] All timestamps are milliseconds
- [ ] WebSocket envelope parsed: `{ type, timestamp, source, data }`
- [ ] Source badge shown when `source === 'replay'`
- [ ] Distance/bearing GPS-gated (`fix_quality >= 2`)
- [ ] Stale detection uses `Date.now() - last_seen_ts`

**Full checklist:** See `integration-checklist.md`

---

**End of Data Binding Map**
