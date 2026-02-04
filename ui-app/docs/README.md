# N-Defender UI Documentation

**SOURCE OF TRUTH:**
- Data contract: `contracts.ts` + `schema.json`
- UX & behavior rules: `spces.md`
- Integration rules: `data-binding-map.md`

**Last Updated:** 2026-01-26

**Status:** ✅ Canonical Documentation (All Legacy Docs Deprecated)

---

## ⚠️ CRITICAL: READ THIS FIRST

This documentation set is the **ONLY** source of truth for N-Defender UI implementation and backend integration.

**ALL PREVIOUS DOCUMENTATION IS DEPRECATED.**

If you find contradictions between files, **this is a bug** — report it immediately.

---

## 📋 Documentation Structure

### 🔴 Core Specification (Read in Order)

1. **[spces.md](./spces.md)** — UX & Behavior Specification
   - User experience requirements
   - Screen layouts and flows
   - Interaction patterns
   - Stale/Lost/Replay rules
   - GPS gating rules
   - "UI Must Not Lie" principles

2. **[contracts.ts](./contracts.ts)** — TypeScript Contract Definitions
   - Complete type definitions
   - Field naming rules (CANONICAL)
   - Units specifications
   - Helper functions
   - Type guards

3. **[schema.json](./schema.json)** — JSON Schema Validation
   - Backend/UI contract validation
   - Field type enforcement
   - Required field specifications
   - Enum value definitions

### 🟡 Integration Documentation

4. **[data-binding-map.md](./data-binding-map.md)** — UI Data Binding Map
   - UI component → backend field mappings
   - REST API bindings
   - WebSocket event bindings
   - GPS gating implementations
   - Code examples

5. **[integration-checklist.md](./integration-checklist.md)** — Integration Readiness Checklist
   - Pre-integration verification
   - Endpoint correctness
   - Naming correctness
   - Units correctness
   - GPS gating verification
   - "UI Must Not Lie" verification

---

## 🔒 NON-NEGOTIABLE CONTRACT RULES

### Endpoints (LOCKED)

```
REST:       GET /api/v1/status
WebSocket:  ws://<host>:<port>/api/v1/ws
            wss://<host>:<port>/api/v1/ws (HTTPS)
```

**❌ NEVER USE:**
- `/status` (legacy alias only)
- `/ws` (legacy alias only)

### WebSocket Envelope (MANDATORY)

**ALL WebSocket messages use this structure:**
```json
{
  "type": "TELEMETRY_UPDATE | CONTACT_NEW | CONTACT_UPDATE | CONTACT_LOST | REPLAY_STATE",
  "timestamp": 1700000000000,
  "source": "live" | "replay",
  "data": { ... }
}
```

### Event Names (CANONICAL)

```
TELEMETRY_UPDATE    — Updates system telemetry
CONTACT_NEW         — New contact detected
CONTACT_UPDATE      — Existing contact updated
CONTACT_LOST        — Contact lost (aged out)
REPLAY_STATE        — Replay mode state change
```

**❌ LEGACY EVENT NAMES (DO NOT USE):**
- `RID_CONTACT_NEW` → Use `CONTACT_NEW`
- `telemetry_update` → Use `TELEMETRY_UPDATE`

---

## 🔒 NAMING RULES (LOCKED)

### GPS Status (from `/api/v1/status`)

| ✅ CORRECT | ❌ WRONG | Notes |
|-----------|---------|-------|
| `gps.latitude` | `gps.lat` | GPS uses full names |
| `gps.longitude` | `gps.lng` | GPS uses full names |
| `gps.speed_mps` | `gps.speed` | Meters per second |
| `gps.heading_deg` | `gps.heading` | Degrees |
| `gps.hdop` | `gps.accuracy` | Horizontal dilution of precision |
| `gps.sats` | `gps.satellites` | Satellite count |
| `gps.fix_quality` | `gps.fix` | 0=none, 1=gps, 2=dgps |

### Remote ID Coordinates (from WebSocket)

| ✅ CORRECT | ❌ WRONG | Notes |
|-----------|---------|-------|
| `drone_coords.lat` | `drone_coords.latitude` | Remote ID uses abbreviated |
| `drone_coords.lon` | `drone_coords.lng` | NO "lng" ANYWHERE |
| `drone_coords.alt_m` | `drone_coords.altitude` | Meters |
| `pilot_coords.lat` | `pilot_coords.latitude` | Abbreviated |
| `pilot_coords.lon` | `pilot_coords.lng` | NO "lng" ANYWHERE |

### Derived Fields (UI Computed)

| Field | Source | Notes |
|-------|--------|-------|
| `derived.distance_m` | Computed from GPS + coords | GPS-gated |
| `derived.bearing_deg` | Computed from GPS + coords | GPS-gated |

---

## 🔒 UNITS RULES (LOCKED)

| Field Type | Contract Unit | Display Conversion |
|------------|---------------|-------------------|
| Frequency | `freq_hz` (Hz) | `freq_hz / 1e6` → "5860 MHz" |
| Timestamps | milliseconds | Use directly with `Date.now()` |
| Speed | `speed_mps` (m/s) | `speed_mps * 3.6` → "45 km/h" |
| Heading | `heading_deg` (degrees) | Display as "245°" or "SW" |
| Altitude | `alt_m` (meters) | `alt_m * 3.28084` → "394 ft" (optional) |
| Distance | `distance_m` (meters) | "1200 m" or "1.2 km" |
| RSSI | `rssi_dbm` (dBm) | "-68 dBm" |

**❌ NEVER USE:**
- `freq_mhz` (does not exist in contract)
- Seconds for timestamps (always milliseconds)
- `lng` for longitude (use `lon` or `longitude`)

---

## 🔒 GPS GATING RULE (LOCKED)

**Distance, bearing, map centering, and "nearest drone" are ONLY allowed when:**

```typescript
gps.fix_quality >= 2
```

**When GPS is invalid (`fix_quality < 2`):**
- ❌ Hide distance/bearing
- ❌ Hide "nearest drone" calculations
- ❌ Disable "Center on Me" button
- ❌ Do NOT show user location marker on map
- ✅ Show "GPS fix required" placeholder
- ✅ Show GPS status indicator (red/warning)

**NEVER:**
- Show fake coordinates (0, 0)
- Estimate or interpolate position
- Show stale GPS data as current

---

## 🔒 CONTACT MODEL (CANONICAL)

### Contact Types

```typescript
type ContactType = 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF';
```

**❌ LEGACY TYPES (DO NOT USE):**
- `'remote-id'` → Use `'REMOTE_ID'`
- `'fpv'` → Use `'FPV_LINK'`
- `'unknown'` → Use `'UNKNOWN_RF'`

### Contact Source

```typescript
type ContactSource = 'live' | 'replay';
```

**UI MUST:**
- Display source badge on ALL contacts
- Show "REPLAY" badge when `source === 'replay'`
- Never mix live and replay data silently

### Contact States

| State | Condition | Visual Treatment |
|-------|-----------|------------------|
| **ACTIVE** | `age_ms < 15000` (15s) | Normal colors, no badge |
| **STALE** | `15000 ≤ age_ms < 60000` | Amber border, "STALE" badge |
| **LOST** | `age_ms ≥ 60000` (60s) | Grayed 60%, "LOST" badge |

**LOST Contact Rules:**
- NOT deleted automatically
- Kept in list (grayed out)
- Only removed when operator explicitly dismisses
- Or when backend sends explicit removal instruction

---

## 🔒 REPLAY SAFETY RULES (LOCKED)

**When replay is active (`source === 'replay'`):**

**UI MUST:**
- ✅ Show global banner: "REPLAY ACTIVE — Not Live Data"
- ✅ Show "REPLAY" badge on ALL contacts
- ✅ Disable live-only actions (Start Scan, Lock Target)
- ✅ Add replay watermark to map
- ✅ Show replay controls (Play, Pause, Speed) if applicable

**UI MUST NOT:**
- ❌ Mix live and replay contacts in same list without clear separation
- ❌ Allow operator to trigger live actions
- ❌ Hide the fact that data is replayed
- ❌ Show replay data as "current"

---

## 🚫 UI MUST NOT LIE (CRITICAL PRINCIPLES)

### Principle 1: GPS Gating
**Never show distance/bearing without valid GPS (`fix_quality >= 2`)**

```typescript
// ✅ CORRECT
{gps.fix_quality >= 2 && contact.derived?.distance_m ? (
  <span>{contact.derived.distance_m}m</span>
) : (
  <span className="text-slate-500">GPS fix required</span>
)}

// ❌ WRONG
{contact.derived?.distance_m && <span>{contact.derived.distance_m}m</span>}
```

### Principle 2: Honest Labeling
**Never label uncalibrated values with scientific units**

```typescript
// ✅ CORRECT
{contact.fpv_link?.rssi_dbm !== undefined && (
  <span>{contact.fpv_link.rssi_dbm} dBm</span>
)}

// ❌ WRONG
<span>{rawADCValue} dBm</span>  // Raw ADC is not dBm
```

### Principle 3: Source Transparency
**Never hide replay source**

```typescript
// ✅ CORRECT
{contact.source === 'replay' && <Badge variant="warning">REPLAY</Badge>}

// ❌ WRONG
// No source badge shown
```

### Principle 4: Stale Data Visibility
**Stale data must look stale**

```typescript
// ✅ CORRECT
const isStale = (Date.now() - contact.last_seen_ts) > 15000;
<div className={isStale ? 'opacity-70 border-amber-500' : ''}>

// ❌ WRONG
// No visual difference between fresh and stale data
```

### Principle 5: No Fake Placeholders
**Never show fake values for missing data**

```typescript
// ✅ CORRECT
{contact.remote_id?.model ? (
  <span>{contact.remote_id.model}</span>
) : (
  <span className="text-slate-500">—</span>
)}

// ❌ WRONG
<span>{contact.remote_id?.model || "Unknown"}</span>
<span>{contact.distance_m || 0}m</span>
```

---

## 🔍 CROSS-VERIFICATION CHECKLIST

Before declaring documentation complete, verify:

- [ ] `spces.md` ↔ `contracts.ts` ↔ `schema.json` are consistent
- [ ] No instance of `lat` or `lng` in GPS context
- [ ] No instance of `lng` in Remote ID context
- [ ] No `freq_mhz` fields anywhere
- [ ] No seconds timestamps (only milliseconds)
- [ ] No legacy contact types (`'remote-id'`, `'fpv'`, `'unknown'`)
- [ ] GPS gating rule is identical in all files
- [ ] Replay safety rules are identical in all files
- [ ] "UI Must Not Lie" principles are consistent

---

## 🚨 RED FLAGS FOR DEVELOPERS

**NEVER do these things:**

1. ❌ Use `/status` or `/ws` as primary endpoints
2. ❌ Parse WebSocket messages without extracting envelope
3. ❌ Use `gps.lat` or `gps.lng` (GPS uses full names)
4. ❌ Use `drone_coords.lng` (Remote ID uses `lon`, NOT `lng`)
5. ❌ Assume backend sends `freq_mhz` (it's always `freq_hz`)
6. ❌ Use seconds for timestamps (always milliseconds)
7. ❌ Show distance/bearing when `gps.fix_quality < 2`
8. ❌ Hide "REPLAY" badge when `source === 'replay'`
9. ❌ Delete LOST contacts automatically (keep grayed out)
10. ❌ Mix live and replay data silently

---

## 📞 Integration Support

### Before Integration
1. Read `spces.md` (UX behavior)
2. Review `contracts.ts` (data types)
3. Validate against `schema.json` (contract enforcement)
4. Study `data-binding-map.md` (component bindings)
5. Complete `integration-checklist.md` (verification)

### During Integration
- Test with checklist
- Verify GPS gating works
- Verify replay mode works
- Verify stale detection works
- Verify "UI Must Not Lie" principles

### After Integration
- Run all checklist items
- Test edge cases (no GPS, replay mode, stale contacts)
- Verify no fake data displayed

---

## 📊 Documentation Status

| Document | Status | Last Verified |
|----------|--------|---------------|
| README.md | ✅ Complete | 2026-01-26 |
| spces.md | ✅ Complete | 2026-01-26 |
| contracts.ts | ✅ Complete | 2026-01-26 |
| schema.json | ✅ Complete | 2026-01-26 |
| data-binding-map.md | ✅ Complete | 2026-01-26 |
| integration-checklist.md | ✅ Complete | 2026-01-26 |

**Integration Readiness:** ✅ **PASS** (All docs consistent and verified)

---

**Version:** 1.0 (Canonical)  
**Generated:** 2026-01-26  
**Status:** Production Ready
