# N-Defender UI Specification

---

## AUTHORITY (SOURCE OF TRUTH)

- **Data contract:** `docs/contracts.ts` + `docs/schema.json`
- **UX rules:** `docs/spces.md` (this file)
- **Integration map:** `docs/data-binding-map.md`

**Last Updated:** 2026-01-26

**Note on Endpoints:** `/status` and `/ws` are legacy aliases for backward compatibility only. All new code MUST use `/api/v1/status` and `/api/v1/ws`.

---

**SOURCE OF TRUTH:**
- Data contract: `contracts.ts` + `schema.json`
- UX & behavior rules: `spces.md` (this file)
- Integration rules: `data-binding-map.md`

**Last Updated:** 2026-01-26

**Status:** ✅ Canonical UX Specification

---

## 1. INTRODUCTION

### 1.1 Purpose

This document defines the **user experience and behavior** of the N-Defender UI.

It specifies:
- Screen layouts and navigation
- Interaction patterns
- Data display rules
- Safety principles ("UI Must Not Lie")
- GPS gating rules
- Stale/Lost contact handling
- Replay mode behavior

### 1.2 Audience

- Frontend developers implementing the UI
- Backend developers integrating with UI
- QA engineers testing the system
- Product managers validating UX

### 1.3 Scope

**In Scope:**
- Home, Alerts, Logs, Settings screens
- Contact display and management
- Map interaction
- Real-time updates via WebSocket
- Replay mode

**Out of Scope (Future):**
- Raspberry Pi deployment specifics
- Offline map tile caching
- Advanced analytics features
- Multi-user collaboration

---

## 2. CORE PRINCIPLES

### 2.1 Touch-First Design

**The UI is optimized for 7" capacitive touchscreens.**

Requirements:
- Minimum tap target: 48×48px
- Primary controls: 56px height
- Touch feedback (ripple effect)
- No hover-dependent interactions
- Large, readable typography (14px minimum)

### 2.2 Mission-Critical Clarity

**The UI prioritizes safety and clarity over aesthetics.**

Requirements:
- Critical alerts always visible
- Clear visual hierarchy
- Consistent component behavior
- No ambiguity in status indicators
- Obvious stale data indicators

### 2.3 UI Must Not Lie

**The UI NEVER shows misleading or fake data.**

Requirements:
- No distance/bearing without valid GPS (GPS gating: require `gps.fix_quality >= 2`)
- No fake coordinates (0, 0)
- No mixing live and replay data silently
- Stale data must look stale
- Source badges always visible (LIVE/REPLAY)

---

## 3. SCREEN LAYOUTS

### 3.1 App Shell Structure

```
┌─────────────────────────────────────┐
│ TopStatusBar (fixed)                │ ← ESP32, FPV, GPS, Storage, Alerts
├─────────────────────────────────────┤
│                                     │
│                                     │
│ Screen Content (scrollable)         │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ PanicControls (dock, collapsible)   │ ← Mute, Ack, Stop, Lock
├─────────────────────────────────────┤
│ BottomTabs (fixed)                  │ ← Home, Alerts, Logs, Settings
└─────────────────────────────────────┘
```

**TopStatusBar:**
- Always visible
- Shows critical system status
- Tap to open StatusDrawer with details

**BottomTabs:**
- Always visible
- 4 tabs: Home, Alerts, Logs, Settings
- Active tab highlighted

**PanicControls:**
- Collapsible when scrolling
- Always accessible (auto-expands when scroll stops)
- Primary actions: Mute, Ack All, Stop Scan, Lock Strongest

### 3.2 Home Screen

**Primary View: Map + Contacts**

```
┌─────────────────────────────────────┐
│ TopStatusBar                        │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ MapView                         │ │
│ │ ┌─────────┐         ┌─────────┐ │ │
│ │ │ MapHUD  │         │ Compass │ │ │
│ │ └─────────┘         └─────────┘ │ │
│ │                                 │ │
│ │         [Map Content]           │ │
│ │                                 │ │
│ │  [Online/Offline] [MapTools]   │ │
│ └─────────────────────────────────┘ │
│ ═══════════════════════════════════ │ ← Draggable Handle
│ Contacts Drawer (snap: 3 positions) │
│ ┌─────────────────────────────────┐ │
│ │ Filters + Search                │ │
│ │ [All] [RID] [FPV] [Unknown]     │ │
│ ├─────────────────────────────────┤ │
│ │ Contact Count: 12 (3 critical)  │ │
│ ├─────────────────────────────────┤ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ ContactCard                 │ │ │
│ │ │ ContactCard                 │ │ │
│ │ │ ContactCard (scrollable)    │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ PanicControls                       │
├─────────────────────────────────────┤
│ BottomTabs: [Home] Alerts Logs Set │
└─────────────────────────────────────┘
```

**Drawer Snap Positions:**
1. **Collapsed** (15% height) — Shows 1-2 top contacts + handle
2. **Mid** (50% height) — Default, balanced view
3. **Expanded** (85% height) — List-focused, map minimal

**Fullscreen Map Mode:**
- Drawer collapses to thin bar at bottom
- "Exit Fullscreen" button visible
- Pull-up handle to return to Mid snap

**Map Rules:**
- **ONLY Remote ID contacts** are plotted as markers
- FPV and Unknown contacts: **list-only**, no map markers
- User location marker: **ONLY when GPS gating passes (`gps.fix_quality >= 2`)**
- "Center on Me" button: **disabled when GPS gating fails**

### 3.3 Alerts Screen

```
┌─────────────────────────────────────┐
│ TopStatusBar                        │
├─────────────────────────────────────┤
│ Alert Summary                       │
│ Active: 5 | Acked: 12 | Resolved: 8 │
├─────────────────────────────────────┤
│ Actions                             │
│ [Ack All] [Mute] [Mute FPV] [Mute R]│
├─────────────────────────────────────┤
│ Alert List (grouped)                │
│ ┌─────────────────────────────────┐ │
│ │ ▼ Active (5)                    │ │
│ │   ┌───────────────────────────┐ │ │
│ │   │ AlertCard (Critical)      │ │ │
│ │   │ AlertCard (High)          │ │ │
│ │   └───────────────────────────┘ │ │
│ │ ▼ Acknowledged (12)             │ │
│ │ ▼ Resolved (8)                  │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ PanicControls                       │
├─────────────────────────────────────┤
│ BottomTabs: Home [Alerts] Logs Set │
└─────────────────────────────────────┘
```

**Alert Grouping:**
- Active (needs attention)
- Acknowledged (seen, not resolved)
- Resolved (closed)

**Alert Actions:**
- Ack All: Mark all active as acknowledged
- Mute: Silence alert sounds
- Mute FPV: Suppress FPV alerts temporarily
- Mute RID: Suppress Remote ID alerts temporarily

### 3.4 Logs Screen

```
┌─────────────────────────────────────┐
│ TopStatusBar                        │
├─────────────────────────────────────┤
│ Filters                             │
│ [15m] [1h] [6h] [24h] [All]         │
│ [Info] [Warn] [Error]               │
├─────────────────────────────────────┤
│ Actions                             │
│ [Export CSV] [Export JSON] [Clear]  │
├─────────────────────────────────────┤
│ Log List                            │
│ ┌─────────────────────────────────┐ │
│ │ 14:32:15 [INFO] Contact new: R  │ │
│ │ 14:32:10 [WARN] GPS HDOP high   │ │
│ │ 14:32:05 [ERROR] WS disconnect  │ │
│ │ (scrollable)                    │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ PanicControls                       │
├─────────────────────────────────────┤
│ BottomTabs: Home Alerts [Logs] Set │
└─────────────────────────────────────┘
```

**Log Filters:**
- Time range: 15m, 1h, 6h, 24h, All
- Level: Info, Warn, Error
- Tags: FPV, Remote ID, GPS, System

**Export:**
- CSV: Comma-separated values
- JSON: Structured export

### 3.5 Settings Screen

```
┌─────────────────────────────────────┐
│ TopStatusBar                        │
├─────────────────────────────────────┤
│ Settings List                       │
│ ┌─────────────────────────────────┐ │
│ │ ▼ Display                       │ │
│ │   Theme: [System] Dark Light    │ │
│ │   Brightness: [■■■■■□□□]        │ │
│ │                                 │ │
│ │ ▼ FPV Scanner                   │ │
│ │   Threshold: [Balanced ▼]       │ │
│ │   Band: [5.8 GHz ▼]             │ │
│ │                                 │ │
│ │ ▼ Alerts                        │ │
│ │   Sound: [On]                   │ │
│ │   Vibration: [On]               │ │
│ │                                 │ │
│ │ ▼ Diagnostics                   │ │
│ │   System Info                   │ │
│ │   Network Status                │ │
│ │   [Factory Reset]               │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ BottomTabs: Home Alerts Logs [Set] │
└─────────────────────────────────────┘
```

**Settings Categories:**
- Display (theme, brightness)
- FPV Scanner (threshold, band)
- Remote ID (filters)
- Alerts (sound, vibration)
- GPS (NMEA output)
- Network (Wi-Fi, Ethernet)
- Diagnostics (system info, logs)
- About (version, legal)

---

## 4. CONTACT MODEL & BEHAVIOR

### 4.1 Contact Types

```typescript
type ContactType = 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF';
```

**Remote ID Contact:**
- Has model, serial, operator ID
- Has drone/pilot/home coordinates
- Plotted on map
- Shows distance/bearing (GPS gating: require `gps.fix_quality >= 2` for distance/bearing/map centering)

**FPV Link Contact:**
- Has frequency, RSSI, lock state
- NO coordinates
- List-only (not plotted on map)
- Shows frequency in MHz (converted from Hz)

**Unknown RF Contact:**
- Generic signal
- NO coordinates
- List-only (not plotted on map)
- Shows signal strength

### 4.2 Contact Source

```typescript
type ContactSource = 'live' | 'replay';
```

**Live:**
- Real-time detection
- No special badge (or subtle "LIVE" badge)
- Enables all actions

**Replay:**
- Historical playback
- **MANDATORY "REPLAY" badge** (amber/orange)
- Disables live-only actions
- Global "REPLAY ACTIVE" banner shown

### 4.3 Contact States

| State | Age Condition | Visual Treatment |
|-------|---------------|------------------|
| **ACTIVE** | `age_ms < 15000` (15 seconds) | Normal colors, no badge |
| **STALE** | `15000 ≤ age_ms < 60000` (15-60s) | Amber border, "STALE" badge, 90% opacity |
| **LOST** | `age_ms ≥ 60000` (60 seconds) | Gray 60% opacity, "LOST" badge, moved to bottom |

**Age Calculation:**
```typescript
const age_ms = Date.now() - contact.last_seen_ts;
```

**STALE Behavior:**
- Visual indicator (amber border)
- "STALE" badge
- Slightly reduced opacity (90%)
- Remains in normal position

**LOST Behavior:**
- Strong visual indicator (grayed out 60%)
- "LOST" badge (red)
- Optionally moved to bottom of list
- **NOT deleted automatically**
- Only removed when:
  - Operator explicitly dismisses
  - Backend sends explicit removal instruction

### 4.4 Contact Card Layout

```
┌─────────────────────────────────────┐
│ │ [Icon] DJI Mavic 3      [REPLAY] │ ← Type + Badge
│ │        DJI-123456        [STALE] │ ← ID + State
│ │        245m · 135°  •  3s ago    │ ← Distance/Time
│ │        [Pin] [Tag] [Lock]        │ ← Quick Actions
└─────────────────────────────────────┘
```

**Elements:**
- **Left Border:** 4px colored severity stripe (red/amber/yellow/blue/gray)
- **Type Icon:** MapPin (RID), Radio (FPV), AlertCircle (Unknown)
- **Primary Text:** Model/Serial (RID), Frequency (FPV), "Unknown" (Unknown)
- **Badges:** Source (REPLAY), State (STALE/LOST), Pinned
- **Metadata:** Distance/Bearing (GPS-gated), Last Seen
- **Quick Actions:** Pin, Tag, Lock (if critical)

### 4.5 GPS Gating for Contact Display

**GPS gating rule: Distance and Bearing are ONLY shown when `gps.fix_quality >= 2`**

```typescript
gps.fix_quality >= 2
```

**Display Logic:**
```typescript
// ✅ CORRECT
{gps.fix_quality >= 2 && contact.derived?.distance_m !== undefined ? (
  <span>{contact.derived.distance_m}m · {contact.derived.bearing_deg}°</span>
) : (
  <span className="text-slate-500">GPS fix required</span>
)}
```

**When GPS gating fails:**
- Show "GPS fix required" placeholder
- Do NOT show "0m · 0°" or any fake values
- Do NOT show stale GPS coordinates

---

## 5. MAP INTERACTION

### 5.1 Map Markers

**ONLY Remote ID contacts are plotted as map markers.**

**Marker Rules:**
- Plot when: `contact.type === 'REMOTE_ID'` AND `drone_coords.lat` AND `drone_coords.lon` exist
- Icon: Severity-based (red/amber/yellow/blue/gray)
- Label: Model name or truncated ID
- Tap: Opens contact details sheet

**FPV and Unknown contacts:**
- **NOT plotted on map**
- List-only display

### 5.2 User Location

**GPS gating: User location marker is ONLY shown when `gps.fix_quality >= 2`**

```typescript
gps.fix_quality >= 2
```

**Display Rules:**
- Blue circle with accuracy radius
- Pulsing animation when `fix_quality === 2` (DGPS)
- Static when `fix_quality === 1` (GPS)
- **Hidden when `fix_quality === 0`** (no fix)

### 5.3 Map Controls

**MapToolStack (right side):**
- Fullscreen toggle
- Focus Selected (enabled only when contact selected)
- Fit Markers (enabled only when markers exist)
- Center Me (GPS gating: enabled only when `gps.fix_quality >= 2`)
- Zoom In (+)
- Zoom Out (-)

**MapModeControls (bottom-left):**
- Online (OSM tiles)
- Offline (cached tiles)
- Auto (switches based on network)

**Compass (top-right):**
- Shows map heading
- Tap to reset to North

### 5.4 Map Gating Rules

**GPS gating: "Center on Me" button:**
- **Enabled:** `gps.fix_quality >= 2`
- **Disabled:** `gps.fix_quality < 2`
- Disabled state shows tooltip: "GPS fix required"

**"Fit Markers" button:**
- **Enabled:** At least 1 Remote ID marker exists
- **Disabled:** No Remote ID markers
- Disabled state shows tooltip: "No contacts to display"

**"Focus Selected" button:**
- **Enabled:** A contact is selected
- **Disabled:** No contact selected
- Disabled state shows tooltip: "Select a contact first"

---

## 6. REPLAY MODE BEHAVIOR

### 6.1 Replay Detection

**Replay mode is active when:**
```typescript
contact.source === 'replay'
```

Or when WebSocket envelope has:
```json
{
  "type": "REPLAY_STATE",
  "data": { "is_replaying": true }
}
```

### 6.2 Replay UI Requirements

**When replay is active:**

**Global Banner (Top of Screen):**
```
┌─────────────────────────────────────┐
│ ⚠️ REPLAY ACTIVE — Not Live Data   │ ← Amber background, cannot dismiss
└─────────────────────────────────────┘
```

**Contact Badges:**
- ALL contacts show "REPLAY" badge (amber/orange)
- Badge is always visible, never hidden

**Disabled Controls:**
- "Start Scan" → Disabled, tooltip: "Not available in replay mode"
- "Stop Scan" → Disabled
- "Lock Target" → Disabled
- "Mute FPV" → Disabled (replay has no live scanner)

**Enabled Controls:**
- Map navigation (zoom, pan)
- Contact filters
- Contact details
- Export logs
- Replay controls (Play, Pause, Speed, if implemented)

**Map Watermark:**
- "REPLAY" text in corner of map
- Subtle, but visible

### 6.3 Replay Safety Rules

**NEVER:**
- ❌ Mix live and replay contacts in same list without clear separation
- ❌ Allow operator to trigger live actions during replay
- ❌ Hide the fact that data is replayed
- ❌ Show replay timestamp as "current time"

**ALWAYS:**
- ✅ Show "REPLAY ACTIVE" banner
- ✅ Show "REPLAY" badge on all contacts
- ✅ Disable live-only actions
- ✅ Make replay mode visually obvious

---

## 7. STALE DATA HANDLING

### 7.1 Telemetry Staleness

**Telemetry Age Calculation:**
```typescript
const telemetryAge_s = (Date.now() - lastTelemetryTimestamp_ms) / 1000;
```

**Telemetry Age Display:**
- `< 5s` → Green, "2.5s"
- `5s - 30s` → Amber, "15s"
- `> 30s` → Red, "Stale (45s)"

**Telemetry Stale Behavior:**
- Show age prominently in MapHUD
- Show warning icon in StatusBar
- If `age > 60s`, show "Disconnected" banner

### 7.2 Contact Staleness

**Contact Age Calculation:**
```typescript
const age_ms = Date.now() - contact.last_seen_ts;
```

**Contact States:**
- **ACTIVE:** `age_ms < 15000` (15s)
- **STALE:** `15000 ≤ age_ms < 60000` (15-60s)
- **LOST:** `age_ms ≥ 60000` (60s)

**Visual Indicators:**
- ACTIVE: Normal appearance
- STALE: Amber border, "STALE" badge, 90% opacity
- LOST: Gray 60% opacity, "LOST" badge, bottom of list

### 7.3 WebSocket Disconnect

**When WebSocket disconnects:**

**StatusBar:**
- Show "Disconnected" badge (red)
- Show "Last updated Xs ago"

**MapHUD:**
- Show telemetry age in red
- Add "(Stale)" suffix to marker count

**ContactsList:**
- Show banner: "Disconnected — Showing last known data"
- Gray out all contacts (80% opacity)
- Freeze last_seen timestamps (don't update)

**Map:**
- Keep last known marker positions
- Add pulsing outline to markers (indicates stale)

**Actions:**
- Disable all live-only actions
- Show tooltip: "Reconnecting..."

---

## 8. GPS GATING RULES (COMPREHENSIVE)

### 8.1 GPS Quality Levels

```typescript
enum GPSFixQuality {
  NONE = 0,   // No GPS fix
  GPS = 1,    // Standard GPS
  DGPS = 2    // Differential GPS (high accuracy)
}
```

### 8.2 Gating Rule (LOCKED)

**GPS gating: Distance, bearing, map centering, and "nearest drone" are ONLY allowed when `gps.fix_quality >= 2`**

```typescript
gps.fix_quality >= 2
```

**Rationale:**
- Standard GPS (`fix_quality === 1`) has 5-10m accuracy
- Not reliable for tactical distance/bearing calculations
- DGPS (`fix_quality === 2`) has <1m accuracy
- Safe for operator decision-making

### 8.3 UI Elements Gated by GPS

| UI Element | Gated | Shown When | Hidden/Disabled When |
|------------|-------|------------|---------------------|
| User location marker | ✅ Yes | `fix_quality >= 2` | `fix_quality < 2` |
| Distance (contact card) | ✅ Yes | `fix_quality >= 2` | "GPS fix required" |
| Bearing (contact card) | ✅ Yes | `fix_quality >= 2` | "GPS fix required" |
| "Center on Me" button | ✅ Yes | `fix_quality >= 2` | Disabled + tooltip |
| "Nearest Drone" calculation | ✅ Yes | `fix_quality >= 2` | Not computed |
| GPS coordinates display | ❌ No | Always | Show "—" if invalid |
| GPS fix quality indicator | ❌ No | Always | Show red/amber/green |

### 8.4 GPS Status Display

**StatusBar GPS Indicator:**
- **Red:** `fix_quality === 0` (No fix)
- **Amber:** `fix_quality === 1` (GPS, not accurate enough)
- **Green:** `fix_quality === 2` (DGPS, good)

**GPS Details (in StatusDrawer):**
```
GPS Fix: DGPS                    ← fix_quality === 2
Latitude: 37.774900°             ← gps.latitude
Longitude: -122.419400°          ← gps.longitude
Altitude: 10m                    ← gps.alt_m
HDOP: 0.8                        ← gps.hdop
Satellites: 12                   ← gps.sats
Speed: 0.5 m/s                   ← gps.speed_mps
Heading: 245°                    ← gps.heading_deg
```

**When GPS is invalid:**
```
GPS Fix: None                    ← fix_quality === 0
Coordinates: —
Altitude: —
HDOP: —
Satellites: 0
```

---

## 9. UI MUST NOT LIE (DETAILED RULES)

### 9.1 Principle: GPS Gating

**Rule:** GPS gating: Never show distance/bearing without valid GPS (`fix_quality >= 2`)

**Correct Implementation:**
```tsx
{gps.fix_quality >= 2 && contact.derived?.distance_m !== undefined ? (
  <span className="text-slate-100">{contact.derived.distance_m}m · {contact.derived.bearing_deg}°</span>
) : (
  <span className="text-slate-500">GPS fix required</span>
)}
```

**Wrong Implementation:**
```tsx
// ❌ Shows distance even with bad GPS
{contact.derived?.distance_m && <span>{contact.derived.distance_m}m</span>}

// ❌ Shows fake "0m" when GPS invalid
<span>{contact.derived?.distance_m || 0}m</span>
```

### 9.2 Principle: Honest Labeling

**Rule:** Never label uncalibrated values with scientific units

**Correct Implementation:**
```tsx
// Only show "dBm" if backend sends calibrated rssi_dbm
{contact.fpv_link?.rssi_dbm !== undefined && (
  <span>{contact.fpv_link.rssi_dbm} dBm</span>
)}
```

**Wrong Implementation:**
```tsx
// ❌ Raw ADC value is NOT dBm
<span>{rawADCValue} dBm</span>

// ❌ Fake unit on uncalibrated data
<span>{signalStrength} dBm</span>
```

### 9.3 Principle: Source Transparency

**Rule:** Never hide replay source

**Correct Implementation:**
```tsx
{contact.source === 'replay' && (
  <Badge variant="warning">REPLAY</Badge>
)}
```

**Wrong Implementation:**
```tsx
// ❌ No source badge shown
<ContactCard contact={contact} />

// ❌ Hiding replay badge when "not important"
{showReplayBadge && contact.source === 'replay' && <Badge>REPLAY</Badge>}
```

### 9.4 Principle: Stale Data Visibility

**Rule:** Stale data must look stale

**Correct Implementation:**
```tsx
const age_ms = Date.now() - contact.last_seen_ts;
const isStale = age_ms > 15000;
const isLost = age_ms > 60000;

<div className={cn(
  'contact-card',
  isStale && 'border-amber-500 opacity-90',
  isLost && 'opacity-60 grayscale'
)}>
  {isStale && !isLost && <Badge variant="warning">STALE</Badge>}
  {isLost && <Badge variant="error">LOST</Badge>}
</div>
```

**Wrong Implementation:**
```tsx
// ❌ No visual difference between fresh and stale
<div className="contact-card">
  {/* ... */}
</div>
```

### 9.5 Principle: No Fake Placeholders

**Rule:** Never show fake values for missing data

**Correct Implementation:**
```tsx
{contact.remote_id?.model ? (
  <span className="text-slate-100">{contact.remote_id.model}</span>
) : (
  <span className="text-slate-500">—</span>
)}

{contact.remote_id?.serial_id ? (
  <span className="text-slate-400">{contact.remote_id.serial_id}</span>
) : (
  <span className="text-slate-600">No serial</span>
)}
```

**Wrong Implementation:**
```tsx
// ❌ "Unknown" is misleading (we don't know if it's unknown or missing)
<span>{contact.remote_id?.model || "Unknown"}</span>

// ❌ Showing "0" for missing distance
<span>{contact.derived?.distance_m || 0}m</span>

// ❌ Fake coordinates
<span>{gps.latitude || 0}, {gps.longitude || 0}</span>
```

---

## 10. ACCESSIBILITY

### 10.1 Touch Targets

**Minimum Sizes:**
- Touch target: 48×48px
- Primary controls: 56px height
- Icon buttons: 48×48px
- Drawer handle: 48px tap area

### 10.2 Typography

**Minimum Sizes:**
- Body text: 14px
- Labels: 12px
- Meta text: 11px (absolute minimum)

**Never use text smaller than 11px.**

### 10.3 Contrast

**WCAG AA Compliance:**
- Normal text: 4.5:1 contrast
- Large text (18px+): 3:1 contrast
- UI components: 3:1 contrast

### 10.4 Keyboard Navigation

**Not primary input method, but should work:**
- Tab through interactive elements
- Enter/Space to activate
- Escape to close modals/sheets
- Arrow keys for lists

### 10.5 Screen Reader

**Semantic HTML:**
- Proper heading hierarchy
- ARIA labels on icon buttons
- ARIA live regions for alerts
- Role attributes for custom controls

---

## 11. PERFORMANCE

### 11.1 Contact List Rendering

**When contact count > 100:**
- Use virtual scrolling
- Render only visible items
- Debounce scroll events

### 11.2 Map Updates

**When markers > 50:**
- Implement marker clustering
- Debounce position updates
- Use canvas rendering instead of DOM

### 11.3 WebSocket Handling

**Event Processing:**
- Debounce rapid updates (max 10/second per contact)
- Batch UI updates (use requestAnimationFrame)
- Limit re-renders (React.memo, useMemo)

---

## 12. ERROR HANDLING

### 12.1 Network Errors

**REST API Failure:**
- Show error banner: "Failed to load system status"
- Retry automatically (exponential backoff)
- Allow manual retry

**WebSocket Disconnect:**
- Show "Disconnected" indicator
- Auto-reconnect after 5 seconds
- Show reconnect attempts: "Reconnecting... (attempt 3)"

### 12.2 GPS Errors

**No GPS Fix:**
- Show red GPS indicator
- Hide distance/bearing (GPS-gated)
- Disable "Center on Me" button
- Show "GPS fix required" in contact cards

### 12.3 Data Errors

**Malformed Data:**
- Log error to console
- Show "—" placeholder for invalid fields
- Do NOT crash the UI
- Send error report (if telemetry enabled)

---

## 13. TESTING REQUIREMENTS

### 13.1 Manual Tests

**GPS Gating:**
- [ ] Load with `fix_quality === 0` → No distance/bearing shown
- [ ] Load with `fix_quality === 1` → No distance/bearing shown
- [ ] Load with `fix_quality === 2` → Distance/bearing shown
- [ ] Toggle GPS quality → UI updates correctly

**Replay Mode:**
- [ ] Load replay data → "REPLAY ACTIVE" banner shown
- [ ] All contacts have "REPLAY" badge
- [ ] Live actions disabled
- [ ] Map has replay watermark

**Stale Contacts:**
- [ ] Wait 15s → Contact shows "STALE" badge
- [ ] Wait 60s → Contact shows "LOST" badge and grays out
- [ ] Lost contact NOT deleted automatically

**WebSocket Disconnect:**
- [ ] Disconnect WS → "Disconnected" indicator shown
- [ ] Contacts gray out
- [ ] Telemetry age shows "Stale"

### 13.2 Automated Tests

**Unit Tests:**
- [ ] `hasValidGPS()` returns true when `gps.fix_quality >= 2`
- [ ] `isContactStale()` detects stale correctly
- [ ] Frequency conversion Hz → MHz is correct
- [ ] WebSocket envelope parsing works

**Integration Tests:**
- [ ] Fetch `/api/v1/status` and parse response
- [ ] Connect to `/api/v1/ws` and receive events
- [ ] Parse envelope correctly: `{ type, timestamp, source, data }`
- [ ] GPS gating hides distance when GPS invalid

---

## 14. CHANGELOG

### Version 1.0 (2026-01-26)
- Initial canonical specification
- Locked GPS gating rule (`fix_quality >= 2`)
- Locked contact states (STALE: 15-60s, LOST: >60s)
- Locked replay safety rules
- Locked "UI Must Not Lie" principles

---

**End of Specification**
