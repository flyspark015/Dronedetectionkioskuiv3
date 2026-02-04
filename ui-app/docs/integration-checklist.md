# N-Defender UI Integration Checklist

**SOURCE OF TRUTH:**
- Data contract: `contracts.ts` + `schema.json`
- UX & behavior rules: `spces.md`
- Integration rules: `data-binding-map.md`

**Last Updated:** 2026-01-26

**Status:** ✅ Canonical Integration Verification

---

## PURPOSE

This checklist must be completed **100%** before declaring UI integration ready.

Any unchecked item is a **BLOCKER** for production deployment.

---

## 1. ENDPOINT CORRECTNESS

### REST API
- [ ] UI fetches from `/api/v1/status` (NOT `/status`)
- [ ] No references to `/status` as primary endpoint
- [ ] Timeout configured (5 seconds recommended)
- [ ] Error handling for 404/500 responses

**Verification:**
```bash
grep -r "'/status'" src/  # Should return 0 results
grep -r "'/api/v1/status'" src/  # Should return results
```

### WebSocket
- [ ] UI connects to `/api/v1/ws` (NOT `/ws`)
- [ ] Protocol selection: `ws://` for HTTP, `wss://` for HTTPS
- [ ] Host resolution: `location.host` (not hardcoded)
- [ ] Reconnection logic implemented (5s delay recommended)

**Verification:**
```bash
grep -r "'/ws'" src/  # Should return 0 results (unless commented as legacy)
grep -r "'/api/v1/ws'" src/  # Should return results
```

**PASS/FAIL:** _________

---

## 2. NAMING CORRECTNESS

### GPS Fields
- [ ] Uses `gps.latitude` (NOT `gps.lat`)
- [ ] Uses `gps.longitude` (NOT `gps.lng`)
- [ ] Uses `gps.speed_mps` (NOT `gps.speed`)
- [ ] Uses `gps.heading_deg` (NOT `gps.heading`)
- [ ] Uses `gps.alt_m` (NOT `gps.altitude`)

**Verification:**
```bash
grep -r "gps\.lat[^itude]" src/  # Should return 0 results
grep -r "gps\.lng" src/  # Should return 0 results
grep -r "gps\.latitude" src/  # Should return results
grep -r "gps\.longitude" src/  # Should return results
```

### Remote ID Fields
- [ ] Uses `drone_coords.lat` (NOT `drone_coords.latitude`)
- [ ] Uses `drone_coords.lon` (NOT `drone_coords.lng`)
- [ ] Uses `pilot_coords.lon` (NOT `pilot_coords.lng`)
- [ ] Uses `home_coords.lon` (NOT `home_coords.lng`)
- [ ] Uses `serial_id` (NOT `serialId`)

**Verification:**
```bash
grep -r "drone_coords\.lng" src/  # Should return 0 results
grep -r "pilot_coords\.lng" src/  # Should return 0 results
grep -r "home_coords\.lng" src/  # Should return 0 results
grep -r "\.lon[^g]" src/  # Should return results (lon but NOT lng)
```

### FPV Fields
- [ ] Uses `fpv_link.freq_hz` (NOT `fpv_link.freq_mhz`)
- [ ] Uses `fpv_link.rssi_dbm` (NOT `fpv_link.rssi`)
- [ ] Uses `fpv_link.lock_state` (NOT `fpv_link.state`)

**Verification:**
```bash
grep -r "freq_mhz" src/  # Should return 0 results
grep -r "freq_hz" src/  # Should return results
```

**PASS/FAIL:** _________

---

## 3. UNITS CORRECTNESS

### Frequency
- [ ] Reads `freq_hz` from backend (Hz)
- [ ] Converts to MHz for display: `freq_hz / 1_000_000`
- [ ] No `freq_mhz` field access anywhere

**Code Example:**
```typescript
// ✅ CORRECT
const freqMHz = contact.fpv_link.freq_hz / 1_000_000;
return <span>{freqMHz.toFixed(0)} MHz</span>;

// ❌ WRONG
const freqMHz = contact.fpv_link.freq_mhz;
```

### Timestamps
- [ ] All timestamps treated as milliseconds
- [ ] No division by 1000 for conversion
- [ ] `Date.now()` used for current time (returns ms)
- [ ] Age calculations use milliseconds

**Code Example:**
```typescript
// ✅ CORRECT
const age_ms = Date.now() - contact.last_seen_ts;
const isStale = age_ms > 15_000;

// ❌ WRONG
const age_s = (Date.now() / 1000) - contact.last_seen;
```

### Speed
- [ ] Reads `speed_mps` from backend (m/s)
- [ ] Converts to km/h for display: `speed_mps * 3.6`

### Altitude
- [ ] Reads `alt_m` from backend (meters)
- [ ] Optionally converts to feet: `alt_m * 3.28084`

**PASS/FAIL:** _________

---

## 4. WEBSOCKET ENVELOPE PARSING

### Envelope Structure
- [ ] Parses `{ type, timestamp, source, data }` envelope
- [ ] Extracts `type` field for routing
- [ ] Extracts `timestamp` field for ordering
- [ ] Extracts `source` field for LIVE/REPLAY badge
- [ ] Extracts `data` field for payload

**Code Example:**
```typescript
// ✅ CORRECT
ws.onmessage = (event) => {
  const envelope = JSON.parse(event.data);
  const { type, timestamp, source, data } = envelope;
  
  switch (type) {
    case 'CONTACT_NEW':
      handleNewContact(data, timestamp, source);
      break;
  }
};

// ❌ WRONG
ws.onmessage = (event) => {
  const contact = JSON.parse(event.data);
  addContact(contact);
};
```

### Event Names
- [ ] Expects `TELEMETRY_UPDATE` (NOT `telemetry_update`)
- [ ] Expects `CONTACT_NEW` (NOT `RID_CONTACT_NEW`)
- [ ] Expects `CONTACT_UPDATE` (NOT `RID_CONTACT_UPDATE`)
- [ ] Expects `CONTACT_LOST` (NOT `RID_CONTACT_LOST`)
- [ ] Expects `REPLAY_STATE` (NOT `replay_state`)

**Verification:**
```bash
grep -r "RID_CONTACT" src/  # Should return 0 results (or only in legacy compat)
grep -r "CONTACT_NEW" src/  # Should return results
```

**PASS/FAIL:** _________

---

## 5. CONTACT TYPE CORRECTNESS

### Type Values
- [ ] Uses `'REMOTE_ID'` (NOT `'remote-id'`)
- [ ] Uses `'FPV_LINK'` (NOT `'fpv'`)
- [ ] Uses `'UNKNOWN_RF'` (NOT `'unknown'`)

**Verification:**
```bash
grep -r "'remote-id'" src/  # Should return 0 results
grep -r "'fpv'" src/  # Should return 0 results (except in comments)
grep -r "'REMOTE_ID'" src/  # Should return results
```

**PASS/FAIL:** _________

---

## 6. GPS GATING

### Validity Check
- [ ] Implements `hasValidGPS()` function
- [ ] Check: `gps.fix_quality >= 2`
- [ ] Uses this check for distance/bearing display
- [ ] Uses this check for user location marker
- [ ] Uses this check for "Center on Me" button

**Code Example:**
```typescript
// ✅ CORRECT
const hasValidGPS = gps.fix_quality >= 2;

{hasValidGPS && contact.derived?.distance_m !== undefined ? (
  <span>{contact.derived.distance_m}m</span>
) : (
  <span className="text-slate-500">GPS fix required</span>
)}

// ❌ WRONG
{contact.derived?.distance_m && (
  <span>{contact.derived.distance_m}m</span>
)}
```

### GPS-Gated Elements
- [ ] Distance display GPS-gated
- [ ] Bearing display GPS-gated
- [ ] User location marker GPS-gated
- [ ] "Center on Me" button GPS-gated
- [ ] "Nearest drone" calculation GPS-gated

**Manual Test:**
1. Set `fix_quality = 0` → Distance/bearing hidden
2. Set `fix_quality = 1` → Distance/bearing hidden
3. Set `fix_quality = 2` → Distance/bearing shown

**PASS/FAIL:** _________

---

## 7. SOURCE BADGE (REPLAY MODE)

### Badge Display
- [ ] ALL contacts show source badge when `source === 'replay'`
- [ ] "REPLAY" badge is amber/orange color
- [ ] "REPLAY" badge cannot be hidden
- [ ] Badge visible in contact cards
- [ ] Badge visible in contact details

**Code Example:**
```typescript
// ✅ CORRECT
{contact.source === 'replay' && (
  <Badge variant="warning">REPLAY</Badge>
)}

// ❌ WRONG
// No source badge shown
```

### Global Banner
- [ ] "REPLAY ACTIVE" banner shown when replay
- [ ] Banner cannot be dismissed
- [ ] Banner is at top of screen
- [ ] Banner is bright color (amber/orange)

**Manual Test:**
1. Load replay data → Banner appears
2. All contacts have "REPLAY" badge

**PASS/FAIL:** _________

---

## 8. STALE/LOST DETECTION

### Stale Detection
- [ ] STALE: `15_000 ≤ age_ms < 60_000`
- [ ] Visual: Amber border + "STALE" badge + 90% opacity
- [ ] Uses `Date.now() - contact.last_seen_ts`

### Lost Detection
- [ ] LOST: `age_ms ≥ 60_000`
- [ ] Visual: Gray 60% + "LOST" badge
- [ ] LOST contacts NOT deleted automatically
- [ ] LOST contacts optionally moved to bottom

**Code Example:**
```typescript
// ✅ CORRECT
const age_ms = Date.now() - contact.last_seen_ts;
const isStale = age_ms >= 15_000 && age_ms < 60_000;
const isLost = age_ms >= 60_000;
```

**Manual Test:**
1. Wait 15s → "STALE" badge appears
2. Wait 60s → "LOST" badge appears, contact grays out
3. Lost contact still in list (not deleted)

**PASS/FAIL:** _________

---

## 9. MAP MARKER RULES

### Remote ID Markers
- [ ] ONLY Remote ID contacts plotted
- [ ] Plot condition: `type === 'REMOTE_ID' && drone_coords.lat && drone_coords.lon`
- [ ] Uses `drone_coords.lat` (NOT `latitude`)
- [ ] Uses `drone_coords.lon` (NOT `lng`)

### FPV/Unknown Contacts
- [ ] FPV contacts NOT plotted (list-only)
- [ ] Unknown contacts NOT plotted (list-only)

### User Location
- [ ] User location ONLY shown when `gps.fix_quality >= 2`
- [ ] Uses `gps.latitude` and `gps.longitude`

**Manual Test:**
1. Create FPV contact → Not on map
2. Create Remote ID without coords → Not on map
3. Create Remote ID with coords → Plotted on map
4. Set GPS invalid → User location hidden

**PASS/FAIL:** _________

---

## 10. WEBSOCKET DISCONNECT

### Disconnect Detection
- [ ] UI detects `ws.onclose` event
- [ ] "Disconnected" indicator shown
- [ ] Reconnect timer started (5s recommended)

### UI Behavior
- [ ] StatusBar shows "Disconnected" badge
- [ ] Telemetry age shows "Stale" or "No connection"
- [ ] Contacts grayed out (80% opacity)
- [ ] Banner: "Disconnected — Showing last known data"
- [ ] Map markers keep last position + pulsing outline

### Reconnection
- [ ] Auto-reconnect after delay
- [ ] Exponential backoff (optional)
- [ ] Manual "Retry" button (optional)

**Manual Test:**
1. Disconnect WebSocket → UI shows disconnected state
2. Wait 5s → Reconnect attempt
3. Reconnect → UI returns to normal

**PASS/FAIL:** _________

---

## 11. UI MUST NOT LIE

### Principle 1: GPS Gating
- [ ] No distance/bearing without `gps.fix_quality >= 2`
- [ ] Placeholder shown: "GPS fix required"
- [ ] No fake "0m · 0°" values

### Principle 2: Honest Labeling
- [ ] RSSI labeled "dBm" only if `rssi_dbm` field exists
- [ ] No "dBm" label on raw ADC values

### Principle 3: Source Transparency
- [ ] "REPLAY" badge always shown when `source === 'replay'`
- [ ] No hiding of replay source

### Principle 4: Stale Visibility
- [ ] Stale data has visual indicators (amber border/badge)
- [ ] Lost data has visual indicators (gray + badge)

### Principle 5: No Fake Placeholders
- [ ] Missing data shows "—" or "No data"
- [ ] No "Unknown" for missing model (use "—")
- [ ] No "0" for missing distance (use "GPS fix required")

**Manual Verification:**
- [ ] Verified no fake coordinates
- [ ] Verified no fake distance/bearing
- [ ] Verified stale indicators work
- [ ] Verified source badges always shown

**PASS/FAIL:** _________

---

## 12. PERFORMANCE

### Contact List
- [ ] Virtual scrolling when >100 contacts
- [ ] Debounced scroll events
- [ ] React.memo on ContactCard

### Map Updates
- [ ] Marker clustering when >50 markers
- [ ] Debounced position updates
- [ ] RequestAnimationFrame for batch updates

### WebSocket
- [ ] Debounce rapid updates (max 10/sec per contact)
- [ ] Batch state updates

**PASS/FAIL:** _________

---

## 13. ACCESSIBILITY

### Touch Targets
- [ ] Minimum 48×48px for all buttons
- [ ] Primary controls 56px height

### Contrast
- [ ] Text: 4.5:1 minimum
- [ ] UI components: 3:1 minimum

### Screen Reader
- [ ] ARIA labels on icon buttons
- [ ] Semantic HTML
- [ ] ARIA live regions for alerts

**PASS/FAIL:** _________

---

## 14. ERROR HANDLING

### Network Errors
- [ ] REST API failure shows error banner
- [ ] Auto-retry with backoff
- [ ] Manual retry button

### WebSocket Errors
- [ ] Disconnect detection works
- [ ] Reconnection logic works
- [ ] Error messages clear

### Data Errors
- [ ] Malformed data doesn't crash UI
- [ ] Shows "—" for invalid fields
- [ ] Logs errors to console

**PASS/FAIL:** _________

---

## FINAL INTEGRATION VERDICT

### Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| 1. Endpoints | ☐ | ☐ | |
| 2. Naming | ☐ | ☐ | |
| 3. Units | ☐ | ☐ | |
| 4. WebSocket Envelope | ☐ | ☐ | |
| 5. Contact Types | ☐ | ☐ | |
| 6. GPS Gating | ☐ | ☐ | |
| 7. Source Badge | ☐ | ☐ | |
| 8. Stale/Lost | ☐ | ☐ | |
| 9. Map Markers | ☐ | ☐ | |
| 10. WS Disconnect | ☐ | ☐ | |
| 11. UI Must Not Lie | ☐ | ☐ | |
| 12. Performance | ☐ | ☐ | |
| 13. Accessibility | ☐ | ☐ | |
| 14. Error Handling | ☐ | ☐ | |

### Overall Verdict

- [ ] ✅ **PASS** — All checks completed, integration ready
- [ ] ❌ **FAIL** — Issues found, integration blocked

**Failing Items:**
_________________________________________
_________________________________________
_________________________________________

**Action Required:**
_________________________________________
_________________________________________
_________________________________________

---

**Checklist Completed By:** _________  
**Date:** _________  
**Signature:** _________

---

**End of Integration Checklist**
