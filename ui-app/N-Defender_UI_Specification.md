# N-Defender UI — Complete Technical Specification

## 0) Product Purpose

N-Defender is a ruggedized kiosk-based drone detection and tracking system that monitors airspace in real time using three detection sources: (1) Remote ID broadcasts (via ODID protocol), (2) FPV video transmission scanning (5.8GHz AntSDR), and (3) Unknown/unclassified signals. The operator-first UI runs on a 7" Raspberry Pi touchscreen, presenting unified contact management, real-time alerts with severity classification, comprehensive event logging with CSV/JSON export, and full forensic replay capabilities for captured PCAP files. The interface prioritizes safety-critical information delivery, two-tap maximum action paths, and readability at arm's length in both day and night operational conditions.

---

## 1) Navigation + Information Architecture

### Navigation Pattern

**Primary Navigation:** Bottom tab bar (persistent)

- Visible at all times across all screen sizes
- 4 fixed tabs: Home | Alerts | Logs | Settings
- Icons + labels always visible
- Active tab: solid blue background, white text
- Inactive tabs: slate-700 background, slate-300 text
- Minimum tap target height: 64px (76px on taller displays)

**Secondary Navigation:**

- Status drawer: Pull-down from top status bar "Status" button
- Contact details: Bottom sheet (compact mode) or side panel (wide mode, future)
- Video preview: Full-screen modal overlay (only from FPV contact actions)
- Replay panel: Expandable card within Logs screen
- AntSDR settings: Full-screen navigation from Settings screen

### Routes/Screens

1. **Home** (`/` default)
   - Map-first layout with Remote ID markers only
   - Draggable contacts drawer below map (3 snap points: collapsed/mid/expanded)
   - Fullscreen map mode (hides drawer, shows compact contact count bar)
   - Map controls: Online/Offline/Auto mode, zoom, compass, center-me, fit-markers

2. **Alerts** (`/alerts`)
   - Active/Acknowledged/Resolved sections
   - Quick action toolbar (Ack All, Mute, Mute FPV, Mute RID)
   - Last event summary card
   - Scrolling list grouped by status

3. **Logs** (`/logs`)
   - Live/Replay mode toggle
   - Time range filter chips (15m/1h/6h/24h/All)
   - Level filter chips (All/Info/Warn/Error)
   - Export buttons (CSV/JSON)
   - Replay panel (expandable, contains all replay controls)

4. **Settings** (`/settings`)
   - Sectioned vertical scroll
   - Display & Interface (brightness, glove mode, performance mode)
   - Audio (volume, buzzer test)
   - System status (version, uptime, CPU, battery, storage, network, GPS)
   - Power & Restart (hold-to-confirm buttons)
   - Sensors (ESP32, FPV, Remote ID status)
   - Maps (online/offline mode, map pack manager)
   - Alert Presets (Balanced/Critical Focus/Training)
   - Video Capture (auto-record toggle)
   - Debug (raw telemetry JSON view)
   - AntSDR Settings (navigates to sub-screen)

### Overlays (non-routed)

- **Status Drawer:** Slide down from top, shows detailed telemetry
- **Contact Details Sheet:** Slide up from bottom, 4 tabs (Overview/Data/Actions/History)
- **Video Preview Overlay:** Full-screen video player (FPV contacts only)
- **Panic Controls:** Context-aware floating cluster (always visible, never blocks tabs)

### Operator Flow (1–2 Taps)

- View contact details: Tap contact card → Opens details sheet
- Acknowledge alert: Tap "Ack" button (Panic Controls or Alerts screen)
- Mute alerts: Tap "Mute" button (Panic Controls)
- Lock strongest FPV signal: Tap "Lock Strongest" (Panic Controls on Home)
- Stop scanning: Hold "Stop Scan" button for 2 seconds
- Preview FPV video: Contact details → Actions tab → "Preview Video"
- Export logs: Logs screen → Tap "Export CSV" or "Export JSON"
- Enter replay mode: Logs screen → Toggle "Replay" → Select file → Play
- Change map mode: Home screen → Bottom-left map mode selector (Online/Offline/Auto)

---

## 2) Global Layout (Persistent UI)

### Top Status Bar

**Position:** Fixed at top, z-index 40, always visible
**Height:**

- Normal: `clamp(48px, 6vh, 56px)`
- With critical alert: `clamp(72px, 9vh, 80px)`

**Structure (left-to-right):**

```
[CRITICAL badge] [Scan chip] [ESP32 chip] [GPS chip] ... [Status button]
```

**Elements:**

1. **Critical Alert Badge** (conditional)
   - Background: red-600, pulsing animation
   - Text: "CRITICAL" in uppercase, white, bold
   - Icon: AlertTriangle (14px)
   - Size: auto-width pill, min-height 40px

2. **Status Chips** (horizontal scroll, hide scrollbar)
   - Scan State: "Scan: Scanning" (blue) | "Scan: Locked" (amber) | "Scan: Hold" (default)
   - ESP32: "ESP32: Link" (green) | "ESP32: Off" (red)
   - GPS: "GPS: Fix" (green) | "GPS: No Fix" (amber)
   - All chips: 44px min-height, 11px font size

3. **Status Drawer Button** (right-aligned)
   - Label: "Status" + ChevronDown icon
   - Background: slate-800, border slate-700
   - Size: 44px min-height, auto-width
   - Opens full telemetry drawer on tap

**Critical Alert Banner:**
When `hasCriticalAlert === true`, a second fixed bar appears immediately below status bar:

- Background: red-600
- Text: "CRITICAL ALERT ACTIVE" (uppercase, white, centered, 11px)
- Height: 24px
- No dismiss button (must acknowledge via Panic Controls or Alerts screen)

### Global Alert Banner Behavior

- Shows when any alert has severity "critical" AND status "active"
- Persists until all critical alerts acknowledged or resolved
- Pushes content down by 24px (total top offset becomes 72-80px)
- Animation: slide-down on appear

### Always-Visible Panic Controls Cluster

**Position:** Fixed bottom, above tab bar
**Bottom offset:** `calc(var(--tab-bar-height) + 0.75rem)` (typically ~76px from bottom)
**Z-index:** 30 (above content, below status/tabs)

**Modes:**

1. **Home Mode** (when activeTab === 'home')

   ```
   [Mute] [Ack] [Lock Strongest] [Stop Scan]
   ```

   - 4 buttons, wrapping on narrow screens
   - Mute: Blue (primary), speaker icon
   - Ack: Slate-700 (secondary), checkmark icon
   - Lock Strongest: Amber (warning), target icon
   - Stop Scan: Red (danger), stop icon, HOLD TO CONFIRM (2s)

2. **Alerts Mode** (when activeTab === 'alerts')

   ```
   [Mute] [Ack All] [Stop Scan]
   ```

   - 3 buttons, wrapping on narrow screens

3. **Minimal Mode** (Logs/Settings)

   ```
   [Mute] [Ack] [Stop Scan]
   ```

   - 3 buttons, wrapping on narrow screens

**Button Sizing:**

- Height: 56px (comfortable touch)
- Padding: 16-20px horizontal
- Rounded: 24px (full pill shape)
- Gap: 12px between buttons
- Shadow: medium elevation

**Collapse Behavior:**

- On Home screen, when draggable drawer is scrolling upward, Panic Controls slide down and collapse to just icons (no labels)
- Scrolling down or stopping re-expands labels
- This prevents accidental taps while navigating contacts

### Bottom Tab Navigation

**Position:** Fixed bottom, z-index 40
**Height:** `clamp(64px, 8vh, 76px)`
**Background:** slate-900, border-top slate-800

**Structure:**

```
[Home] [Alerts] [Logs] [Settings]
```

Each tab:

- Icon (20px) + Label (12px font size)
- Active state: bg-blue-600, text-white, rounded-2xl inner pill
- Inactive: bg-transparent, text-slate-300
- Tap target: full-width column, min 64px height
- Vertical layout: icon stacked above label, 4px gap

**Icons:**

- Home: House icon
- Alerts: Bell icon
- Logs: Document icon
- Settings: Gear icon

### Global Spacing + Alignment

**Container Rules:**

- All screens use full viewport width (no max-width on 7" kiosk)
- Future wide-screen (>1280px): content max-width 1360px, centered with auto margins
- Gutters: 16px (mobile), 20px (tablet), 24px (desktop)

**Grid System:**

- Primary: Flexbox column (vertical stacking)
- Secondary: CSS Grid for multi-column layouts (Settings, Maps)
- Gap default: 16px (space-4 token)

**Safe Areas:**

- Top: status bar height + critical banner (if active)
- Bottom: tab bar height + panic controls height
- Content scrolls within safe area only

---

## 3) Screen-by-Screen Specification

### A) Home Screen

**Layout Structure:**

```
┌─────────────────────────────────────┐
│ (Global Status Bar + Critical Banner)│
├─────────────────────────────────────┤
│                                     │
│         MAP PANEL (fills space)     │
│    [Map mode: Online/Offline/Auto]  │
│    [Map tools: zoom, center, etc.]  │
│    [Compass control]                │
│    [HUD: marker count, GPS, age]    │
│    [Scan state widget]              │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  DRAGGABLE CONTACTS DRAWER          │
│  (3 snap points: collapsed/mid/full)│
│  ┌─────────────────────────────┐   │
│  │ [Drag handle]               │   │
│  │ Contacts (6)                │   │
│  │ [Filter chips: All, RID, etc]   │
│  │ [Search contacts...]        │   │
│  │ [Contact card list - scroll]│   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│ (Panic Controls - floating above)   │
│ (Bottom Tab Bar)                    │
└─────────────────────────────────────┘
```

**Map Panel Details:**

- **Background:** slate-900 (placeholder, will be replaced with real map)
- **Empty State Text:**
  - "Map View" (18px, slate-300)
  - "Remote ID markers only" (12px, slate-500)
  - "FPV/Unknown not plotted" (11px, slate-600)
  - "Zoom: 14" (10px, slate-700)

- **Map HUD** (top-left overlay):
  - Position: absolute top-3 left-3
  - Background: slate-900/95 (95% opacity), rounded-2xl, border slate-700
  - Padding: 12px
  - Content:
    - "RID Markers: 2" (12px, slate-300)
    - "Telemetry: 2s" (11px, slate-400)
    - "GPS: ±1.2m" (11px, slate-400)

- **Scan State Widget** (top-left, below HUD):
  - Position: absolute top-[120px] left-3
  - Background: slate-900/95, rounded-2xl, border slate-700
  - Content: colored dot + "SCANNING" text
  - Dot colors: blue (scanning), amber (locked), green (hold), gray (stopped)

- **Compass Control** (top-right):
  - Position: absolute top-3 right-3
  - Circular compass rose showing map heading
  - Tap to reset north

- **Map Mode Selector** (bottom-left, not in fullscreen):
  - Position: absolute bottom-3 left-3
  - 3 segmented buttons: Online | Offline | Auto
  - Icons: Wifi, WifiOff, Globe
  - Active: blue-600 background

- **Selected Contact Overlay** (bottom-left, above map mode):
  - Shows when Remote ID contact selected from list
  - Compact card: contact name + distance + "Clear" button
  - Position: above map mode selector

- **Map Tool Stack** (right side, vertical):
  - Position: absolute right-3, vertically centered
  - Tools (top-to-bottom):
    1. Fullscreen toggle
    2. Focus selected (enabled when contact selected)
    3. Fit all markers (enabled when markers exist)
    4. Center on me (GPS location)
    5. Zoom in (+)
    6. Zoom out (-)
  - Each: 48x48px icon button, slate-800 background, rounded-xl

**Draggable Contacts Drawer:**

- **Snap Points:**
  1. Collapsed: 80px visible (just drag handle + title)
  2. Mid: 50% viewport height (default)
  3. Expanded: 85% viewport height

- **Drag Handle:**
  - Horizontal bar, 40px wide, 4px tall, slate-600
  - Centered at top of drawer
  - Touch target: 60px tall (entire top area)

- **Header Row:**
  - "Contacts (6)" title (18px, semibold)
  - Count badge (dynamic, shows filtered count)

- **Filter Chips Row:**
  - Chips: All | Remote ID | FPV Video | Unknown | Pinned | Tagged
  - Horizontal scroll, no scrollbar
  - Active chip: slate-600 background
  - Inactive: slate-800 background
  - Min-height: 48px each

- **Search Field:**
  - Placeholder: "Search contacts..."
  - Rounded-2xl, 48px height
  - Search icon left-aligned
  - Background: slate-800, border slate-700

- **Contact List:**
  - Vertical scroll (only this area scrolls)
  - Gap: 12px between cards
  - Contact card (see Component Library for full spec)
  - Empty state: "No contacts detected" with antenna icon

**Fullscreen Map Mode:**

When user taps fullscreen button:

- Drawer collapses fully
- Map tools remain visible
- Selected contact overlay hides
- Bottom bar appears: compact "Contacts (6)" + "Exit Fullscreen" button
- Tap bottom bar or "Exit" returns to normal mode

**Responsiveness:**

- Portrait (<800px): Map top 40%, drawer bottom 60%
- Landscape (>800px): Map top 60%, drawer bottom 40%
- Drawer min-height: 200px (ensures filter chips always visible when mid-snap)

**Loading/Empty/Error States:**

- **No GPS:** HUD shows "GPS: No Fix" in amber
- **Stale Telemetry:** HUD shows age in red if >10s
- **No Contacts:** Empty state in drawer list
- **Map Load Error:** Show "Map unavailable" message with retry button

---

### B) Alerts Screen

**Layout Structure:**

```
┌─────────────────────────────────────┐
│ (Global Status Bar + Critical Banner)│
├─────────────────────────────────────┤
│ HEADER STATS (fixed)                │
│  [Critical count]                   │
│  [High count]                       │
│  [Resolved count]                   │
├─────────────────────────────────────┤
│ ACTION BUTTONS (fixed)              │
│  [Ack All] [Mute] [Mute FPV] [Mute RID]│
│  [1m] [5m] [15m]                    │
├─────────────────────────────────────┤
│ ALERTS LIST (scroll)                │
│  [Last Alert card]                  │
│  Active (2)                         │
│    [Alert card 1]                   │
│    [Alert card 2]                   │
│  Acknowledged (1)                   │
│    [Alert card 3]                   │
│  Resolved (0)                       │
├─────────────────────────────────────┤
│ (Panic Controls - floating above)   │
│ (Bottom Tab Bar)                    │
└─────────────────────────────────────┘
```

**Header Stats (Fixed Section):**

- Padding: 16px
- Background: slate-900 (default screen background)
- Border-bottom: slate-700

Three stat cards (vertical stack):

1. **Critical Stat:**
   - Icon: TrendingUp (red)
   - Label: "Critical" (12px, slate-400)
   - Value: "2" (20px, bold, slate-100)
   - Background: red-600/20, rounded-xl

2. **High Stat:**
   - Icon: Bell (orange)
   - Label: "High"
   - Value: "3"
   - Background: orange-600/20

3. **Resolved Stat:**
   - Icon: CheckCircle (green)
   - Label: "Resolved"
   - Value: "5"
   - Background: green-600/20

**Action Buttons (Fixed Section):**

- Padding: 16px
- Background: slate-900
- Border-bottom: slate-800

Row 1 (Primary Actions):

- Ack All (primary button, blue, Bell icon)
- Mute (secondary, Volume icon, toggles to VolumeX when muted)
- Mute FPV (secondary, BellOff icon)
- Mute RID (secondary, BellOff icon)
- Wrapping: flex-wrap on narrow screens

Row 2 (Mute Duration Shortcuts):

- 1m, 5m, 15m buttons (secondary, no icons)
- Small buttons (48px min-height)

**Alerts List (Scrolling Section):**

- Padding: 16px
- Vertical scroll
- Gap: 16px between sections

**Last Alert Card:**

- Blue accent (info color)
- Shows most recent alert regardless of status
- Icon: Clock
- Fields: title, message, timestamp
- No click action (informational only)

**Alert Sections:**

1. Active
2. Acknowledged
3. Resolved

Each section:

- Heading: "Active (2)" (18px, semibold, slate-100)
- Gap: 12px between cards
- Collapsible (future feature)

**Alert Card:**

- Left stripe: colored by severity (critical=red, high=orange, medium=amber, low=blue)
- Badge row: severity badge + timestamp (right-aligned)
- Title: 16px, semibold, slate-100
- Message: 14px, slate-300
- Timestamp: "30s ago" format, 12px, slate-400
- Click action: Opens contact details if contactId exists

**Empty State (no alerts):**

- Centered vertically
- CheckCircle icon (48px, green)
- "All Clear" title (18px, slate-300)
- "No active alerts" subtitle (14px, slate-500)

---

### C) Logs Screen

**Layout Structure:**

```
┌─────────────────────────────────────┐
│ (Global Status Bar + Critical Banner)│
├─────────────────────────────────────┤
│ MODE TOGGLE + FILTERS (fixed)       │
│  [Live / Replay toggle]             │
│  [Time chips: 15m/1h/6h/24h/All]    │
│  [Level chips: All/Info/Warn/Error] │
│  [Tagged toggle] [Auto-scroll toggle]│
│  [Export CSV] [Export JSON]         │
├─────────────────────────────────────┤
│ REPLAY PANEL (conditional, expandable)│
│  [Click to expand/collapse]         │
│  ... (see section E for full spec)  │
├─────────────────────────────────────┤
│ LOGS LIST (scroll)                  │
│  Stats: 0 errors, 2 warnings        │
│  [Log entry 1]                      │
│  [Log entry 2]                      │
│  ...                                │
├─────────────────────────────────────┤
│ (Panic Controls - floating above)   │
│ (Bottom Tab Bar)                    │
└─────────────────────────────────────┘
```

**Mode Toggle + Filters (Fixed Section):**

Padding: 16px
Background: slate-900
Border-bottom: slate-800

**Live/Replay Mode Toggle:**

- Segmented control (2 buttons)
- Live (active by default): blue background when active
- Replay: blue background when active
- Icons: Play icon for both
- When Replay active, shows Replay Panel below

**Time Range Chips:**

- 15m | 1h | 6h | 24h | All
- Horizontal scroll, no scrollbar
- Active: slate-600 background
- Size: 48px min-height

**Level Filter Chips:**

- All | Info | Warn | Error
- Same styling as time chips

**Toggles Row:**

- Tagged Only toggle (checkbox + label)
- Auto-scroll toggle (checkbox + label, default ON)
- Auto-scroll disabled when in replay mode

**Export Buttons:**

- Export CSV (secondary, Download icon)
- Export JSON (secondary, Download icon)
- Wrapping on narrow screens

**Log Entry Stats:**

- Displayed above list
- "0 errors, 2 warnings" format
- Colors: red for errors, amber for warnings
- 12px font size, slate-400

**Logs List (Scrolling Section):**

Each log entry:

- Left icon: severity icon (Info/AlertTriangle/AlertCircle)
- Colors: info=blue, warn=amber, error=red
- Timestamp: "2m ago" format (12px, slate-400)
- Source: "FPV Scanner" (12px, slate-300, medium weight)
- Message: 14px, slate-200
- Tags: Small chips (if present), slate-700 background
- Background: slate-800, rounded-2xl
- Padding: 12px
- Border: slate-700
- Click: expands to show full details (future)

**Empty State (no logs):**

- "No events to display"
- Adjust filters message

---

### D) Settings/Diagnostics Screen

**Layout Structure:**

```
┌─────────────────────────────────────┐
│ (Global Status Bar + Critical Banner)│
├─────────────────────────────────────┤
│ SETTINGS CONTENT (scroll)           │
│  Display & Interface                │
│    [Brightness slider]              │
│    [Glove Mode toggle]              │
│    [Performance Mode toggle]        │
│  Audio                              │
│    [Volume slider]                  │
│    [Test Buzzer button]             │
│  System                             │
│    [Info rows: version, uptime, etc]│
│  Power & Restart                    │
│    [Hold to Reboot UI]              │
│    [Hold to Reboot Device]          │
│  Sensors                            │
│    [ESP32/FPV/RID status]           │
│  Maps                               │
│    [Map mode chips]                 │
│    [Offline pack manager]           │
│  Alert Presets                      │
│  Video Capture                      │
│  Debug                              │
│    [Raw telemetry JSON]             │
│  RF Scanning (AntSDR)               │
│    [Navigate to sub-screen →]      │
├─────────────────────────────────────┤
│ (Panic Controls - floating above)   │
│ (Bottom Tab Bar)                    │
└─────────────────────────────────────┘
```

**Section Pattern:**

- Heading: icon + title (18px, semibold, slate-100)
- Card containing settings
- Gap: 16px between sections
- Padding: 16px outer container

**Display & Interface Section:**

Card contains:

1. **Brightness Slider:**
   - Label: "Brightness" + value "75%" (right-aligned)
   - Range input: 0-100
   - Track: slate-700, thumb: blue-600
   - Height: 12px track

2. **Glove Mode Toggle:**
   - Icon: Hand (slate-400)
   - Label: "Glove Mode" + subtitle "Larger touch targets"
   - Toggle switch (right-aligned)
   - Switch: 56px wide, 32px tall, blue-600 when on

3. **Performance Mode Toggle:**
   - Icon: Zap
   - Label: "Performance Mode" + subtitle "Reduce effects for speed"
   - Toggle switch
   - When enabled: adds `.performance-mode` class to body (disables animations/blur)

**Audio Section:**

1. **Volume Slider:** (same pattern as brightness)
2. **Test Buzzer Button:** Secondary button, full-width

**System Section:**

Info rows (key-value pairs):

- Version: v1.2.5
- Uptime: 3d 14h 23m
- CPU Temp: 48°C
- Battery: 87%
- Storage: 45.2 GB free
- Network: WiFi: Connected
- GPS: 12 satellites, HDOP 1.2

Each row:

- Label: 14px, slate-300, medium weight
- Value: 14px, slate-400, right-aligned
- Border-bottom: slate-800 (last row no border)

**Power & Restart Section:**

Two hold-to-confirm buttons:

1. **Reboot UI:**
   - Icon: RotateCcw
   - Variant: secondary
   - Hold duration: 2 seconds
   - Shows progress fill during hold

2. **Reboot Device:**
   - Icon: Power
   - Variant: danger (red)
   - Hold duration: 3 seconds
   - Shows progress fill during hold

**Maps Section:**

Two cards:

1. **Map Mode Card:**
   - Chips: Online | Offline | Auto
   - Active chip styled as selected

2. **Offline Map Packs Card:**
   - Header: "Offline Map Packs" + "Add Pack" button (secondary, Download icon)
   - Storage bar: shows 2.8 GB / 8 GB used (35% fill, blue-600)
   - Pack list (scrolling if many):
     - Each pack card:
       - MapPin icon (blue-400)
       - Name: "San Francisco Bay Area" (14px, semibold)
       - Details: "Zoom levels 10-16" (12px, slate-400)
       - Size + updated: "1.2 GB • Updated 2 weeks ago" (11px, slate-500)
       - Delete button (trash icon, red-400, top-right)

**Debug Section:**

Raw Telemetry JSON:

- Background: slate-950 (darker than normal card)
- Rounded-2xl
- Padding: 16px
- Max-height: 300px
- Overflow: auto scroll
- Font: mono, 11px, slate-400
- Shows live JSON object

**AntSDR Settings Navigation:**

Large tap target:

- Background: slate-800 (card)
- Hover: slate-750
- Layout: icon + title/subtitle + ChevronRight
- Min-height: 72px
- Title: "Advanced Scanning Configuration" (14px, semibold)
- Subtitle: "Scan profiles, sweep plans, detection & tracking" (12px, slate-400)
- Navigates to full-screen AntSDR settings (separate component)

---

### E) Replay Control Panel (within Logs Screen)

**Position:** Between filters and log list in Logs screen
**Visibility:** Only shown when "Replay" mode is active

**Expandable Card:**

- Header: "Replay Controls" + chevron (up/down)
- Click header to expand/collapse
- Default: collapsed on first Replay mode entry

**Expanded Content Structure:**

```
┌─────────────────────────────────────┐
│ Replay Controls            [△]      │
├─────────────────────────────────────┤
│ Source File                         │
│  [File picker: "Select replay file"]│
│  [Browse button]                    │
│                                     │
│  File metadata (when file selected):│
│    Start: 2024-01-23 14:32:15       │
│    End: 2024-01-23 15:47:22         │
│    Duration: 1h 15m 7s              │
│    Total events: 3,247              │
│    BasicID: 892 | Location: 1,024   │
│    System: 453 | OperatorID: 178    │
│    SHA-256: a3f2e9... (first 8)     │
│                                     │
│ Playback                            │
│  [Play/Pause] [Stop] [Restart] [Step] [Loop]│
│                                     │
│  Playback Speed                     │
│    [0.25×] [0.5×] [1×] [2×] [5×] [10×]│
│                                     │
│  Advanced Interval (optional input) │
│    [0.2s input field]               │
│                                     │
│ Timeline                            │
│  Current: 00:12:34 / 01:15:07       │
│  [━━━━━━●━━━━━━━━━━━━]             │
│  Markers: △ alerts, ● errors, ◇ IDs │
│  [Jump to Next Alert button]        │
│                                     │
│ Filters                             │
│  [Search: ID/MAC/operator/keyword]  │
│  Event types:                       │
│    [BasicID] [Location] [SelfID]    │
│    [System] [OperatorID]            │
│  Display toggles:                   │
│    [✓] Raw  [✓] Decoded             │
│    [ ] Errors  [ ] Stats            │
│  [✓] Only decoded contacts          │
│                                     │
│ Export & Forensics                  │
│  [Export JSONL] [Export CSV]        │
│  [Bookmark] [Copy Current]          │
│  File hash: sha256:a3f2e9...        │
│                                     │
│ Decode Health                       │
│  Frames/sec: 42.3                   │
│  Decode success: 97.2%              │
│  Dropped frames: 3                  │
│  Last error: CRC fail               │
│                                     │
│ Advanced Options                    │
│  [✓] Use original PCAP timing       │
│      Replays with exact packet intervals│
│  [✓] Strict contact TTL             │
│      Remove contacts after timeout  │
└─────────────────────────────────────┘
```

**Component Details:**

**File Picker:**

- Dropdown showing recent files from `/opt/ndefender/logs/`
- Shows filename + date
- "Browse" button opens file browser dialog (system-level)
- Selected file triggers metadata fetch

**File Metadata Display:**

- Background: slate-850, rounded-xl, padding 12px
- Grid layout:
  - Start/end timestamps (12px, slate-300)
  - Duration (14px, bold, slate-100)
  - Event type counts (12px, colored by type)
  - SHA-256 hash (11px, mono, slate-500) with copy button

**Transport Controls:**

- Play/Pause: Primary button when Play, Warning when Pause
- Stop: Secondary (resets timeline to 0)
- Restart: Secondary (resets to 0 but stays in play state)
- Step: Secondary (advances to next event, ~1 second or next packet)
- Loop: Secondary when off, Primary when on (auto-restart at end)

**Speed Chips:**

- 0.25× | 0.5× | 1× | 2× | 5× | 10×
- Active chip: slate-600 background
- Affects replay multiplier

**Interval Override Input:**

- Optional numeric input (seconds)
- Placeholder: "0.2"
- Label: "Override packet interval (advanced)"
- When set, ignores PCAP timing and uses fixed interval

**Timeline Scrubber:**

- Track height: 40px
- Background: slate-800, border slate-700
- Progress fill: blue-600/30
- Playhead: blue-400 vertical line with handle
- Markers:
  - Alerts: red AlertCircle icons
  - Location changes: blue MapPin icons
  - ID changes: purple User icons
  - Decode errors: small red dots
- Hovering marker shows tooltip with label
- Click track to seek
- Drag playhead to scrub

**Jump to Next Alert Button:**

- Position: right side of Timeline header
- Size: sm (32px min-height)
- Icon: AlertCircle
- Seeks timeline to next alert marker after current time
- Disabled if no alerts ahead

**Filters:**

- Search input: full-width, 48px height, Search icon left
- Event type chips: horizontal scroll
- Display toggles: checkboxes with labels
- "Only decoded contacts" checkbox: filters log list to show only fully decoded Remote ID messages

**Export Buttons:**

- Export JSONL: saves selected time range as JSON Lines
- Export CSV: saves selected time range as CSV
- Bookmark: saves current timestamp + note (future)
- Copy Current: copies current event JSON to clipboard

**Forensics Hash:**

- SHA-256 of replay file
- Shows first 16 characters + "..." with copy button
- Purpose: evidence chain of custody

**Decode Health Widget:**

- Background: slate-850, border slate-700
- Icon: Activity (blue-400)
- 2-column grid:
  - Frames/sec: live event rate (14px, blue-400)
  - Decode success: percentage (14px, green-400)
  - Dropped frames: count (14px, red-400)
  - Last error: error message (10px, amber-400)
- Updates in real-time during playback

**Advanced Options:**

- Two checkboxes with descriptions:
  1. **Use original PCAP timing:**
     - When checked: replays packets with exact time deltas from capture
     - When unchecked: uses fixed interval (from override input or default)
  2. **Strict contact TTL:**
     - When checked: contacts expire after TTL timeout (realistic mode)
     - When unchecked: contacts persist until end of replay (review mode)

**REPLAY ACTIVE Banner:**
When in Replay mode, a persistent banner appears at top of screen (below critical alert banner if present):

- Background: amber-600
- Text: "REPLAY MODE • [filename.pcap] • [current time]" (uppercase)
- "Exit Replay" button (right-aligned, white text, rounded-full)
- Z-index: 45 (above everything except modals)
- This banner is visible across ALL screens while in replay mode

---

### F) Contact Details Sheet

**Trigger:** Tap any contact card from Home/Alerts
**Type:** Bottom sheet (slide-up animation)
**Snap Points:**

- Partial: 60% viewport height
- Full: 90% viewport height

**Header:**

- Title: "Contact Details"
- Drag handle (horizontal bar, centered)
- Close button (X icon, top-right)

**Content Structure:**

```
┌─────────────────────────────────────┐
│ ═══ (drag handle)              [×]  │
│ Contact Details                     │
├─────────────────────────────────────┤
│ Badge row:                          │
│  [Remote ID] [CRITICAL] [Pinned] [+2]│
├─────────────────────────────────────┤
│ Quick Actions                       │
│  (buttons vary by contact type)     │
├─────────────────────────────────────┤
│ Tabs: Overview | Data | Actions | History│
├─────────────────────────────────────┤
│ Tab content (scroll)                │
│  ...                                │
└─────────────────────────────────────┘
```

**Badge Row:**

- Type badge (color-coded)
- Severity badge
- Pinned badge (if pinned)
- Tags (first 2 shown, rest as "+N")

**Quick Actions (vary by type):**

**Remote ID contacts:**

- Pin button (secondary)
- Tag button (secondary)
- Focus Map button (secondary)
- Export button (secondary)

**FPV contacts:**

- Preview Video button (primary, Eye icon) ← triggers video overlay
- Lock button (secondary, Target icon)
- Hold button (secondary, Pause icon)
- Tune button (secondary, Radio icon)

**Unknown contacts:**

- Pin button (secondary)
- Tag button (secondary)

**Tabs:**

- 4 tabs: Overview | Data | Actions | History
- Active tab: blue-400 text + bottom border
- Inactive: slate-400 text
- Min-height: 48px each

**Tab Content:**

1. **Overview Tab:**
   - Key-value rows (InfoRow component)
   - Fields depend on contact type:
     - **Remote ID:** Model, Serial ID, Drone position (lat/lng/alt), Pilot position, Home position, Distance, Bearing, Last seen
     - **FPV:** Band, Frequency, RSSI, Lock state, Threshold preset, Hit count, Last seen
     - **Unknown:** Signal strength, Notes, Last seen

2. **Data Tab:**
   - Full JSON dump of contact object
   - Background: slate-950 (darker)
   - Font: mono, 12px
   - Scrollable
   - Copy button (top-right)

3. **Actions Tab:**
   - Placeholder for future custom actions
   - Text: "Additional actions can be configured here."

4. **History Tab:**
   - Timeline of events for this contact
   - Event cards (time + description)
   - Example: "2 minutes ago: Contact detected"
   - Scrollable list

---

### G) Video Preview Overlay

**Trigger:** Tap "Preview Video" in FPV contact details → Actions tab
**Type:** Full-screen modal overlay
**Z-index:** 50 (highest)

**Layout:**

```
┌─────────────────────────────────────┐
│                                 [×] │
│                                     │
│                                     │
│          VIDEO PLAYER               │
│       (16:9 aspect ratio)           │
│                                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Controls                    │   │
│  │ [◀] [▶] [Fullscreen]        │   │
│  │ Quality: [Auto] [720p] [1080p] │
│  └─────────────────────────────┘   │
│                                     │
│  Contact info:                      │
│    5.8GHz · 5860 MHz · -68 dBm      │
│    Lock State: LOCKED               │
│    Recording: ON                    │
│                                     │
│  [Start Recording] [Take Snapshot]  │
└─────────────────────────────────────┘
```

**Close Button:**

- Position: top-right, 16px margin
- Icon: X (white on semi-transparent background)
- Size: 48x48px tap target

**Video Player:**

- Centered in viewport
- Max-width: 90vw, max-height: 60vh
- Aspect ratio: 16:9 maintained
- Background: black
- Loading state: spinner centered
- Error state: "Video unavailable" message

**Controls Bar:**

- Position: below video
- Background: slate-900/95 (glass effect)
- Rounded-2xl
- Padding: 16px
- Play/Pause, Skip backward/forward
- Fullscreen toggle
- Quality selector (chips)

**Contact Info Panel:**

- Frequency, band, RSSI
- Lock state (colored by state)
- Recording status indicator

**Action Buttons:**

- Start/Stop Recording (toggle)
- Take Snapshot (captures current frame)
- Full-width on mobile, inline on desktop

---

## 4) Component Library Inventory

### Naming Convention

`ComponentName/Variant/Size` (e.g., `Button/Primary/MD`)

### Components

#### Button

**File:** `/src/app/components/Button.tsx`

**Variants:**

- `Primary`: bg-blue-600, white text, shadow
- `Secondary`: bg-slate-700, slate-100 text, border slate-600
- `Danger`: bg-red-600, white text, shadow
- `Warning`: bg-amber-600, white text, shadow

**Sizes:**

- `sm`: 48px min-height, 14px font, px-4 py-2
- `md`: 56px min-height, 16px font, px-6 py-3
- `lg`: 64px min-height, 18px font, px-8 py-4

**Props:**

- `children`: text/content
- `variant`: primary | secondary | danger | warning
- `size`: sm | md | lg
- `onClick`: handler
- `disabled`: boolean
- `fullWidth`: boolean
- `icon`: ReactNode (optional, renders before text)

**States:**

- Default
- Hover (brightness +10%)
- Active (scale 0.95)
- Disabled (opacity 0.5, no pointer events)

**Border Radius:** 24px (full pill)

**Usage:** Primary actions, dialogs, forms

---

#### Chip

**File:** `/src/app/components/Chip.tsx`

**Variants:**

- `default`: slate-800 bg, slate-300 text (inactive) | slate-600 bg, slate-100 text (active)
- `success`: emerald-600/20 bg, emerald-400 text, border
- `warning`: amber-600/20 bg, amber-400 text, border
- `danger`: red-600/20 bg, red-400 text, border
- `info`: blue-600/20 bg, blue-400 text, border

**Sizes:**

- `sm`: 44px min-height, 11px font, px-3 py-2
- `md`: 48px min-height, 13px font, px-4 py-2.5

**Props:**

- `label`: string
- `variant`: default | success | warning | danger | info
- `active`: boolean (for filter chips)
- `onClick`: handler (optional, makes clickable)
- `size`: sm | md

**States:**

- Default
- Active (when `active={true}`)
- Hover (brightness +10%, only if clickable)
- Active press (scale 0.95)

**Border Radius:** 9999px (full pill)

**Usage:** Filters, tags, status indicators

---

#### Card

**File:** `/src/app/components/Card.tsx`

**Variants:** Single base variant, styling via className override

**Props:**

- `children`: content
- `onClick`: handler (optional, makes clickable)
- `className`: override classes

**Base Styles:**

- Background: slate-800
- Border: 1px slate-700
- Border radius: 16px
- Padding: 24px
- Shadow: subtle

**States:**

- Default
- Hover (if clickable): slate-750 bg, slate-600 border
- Active (if clickable): scale 0.98

**Usage:** Content containers, list items, info panels

---

#### ContactCard

**File:** `/src/app/components/ContactCard.tsx`

**Props:**

- `contact`: Contact object
- `onClick`: handler
- `isNearest`: boolean (shows "NEAREST" badge)

**Structure:**

- Left stripe: colored by severity (1.5px width, rounded-left)
- Badge row: type badge, severity badge, state badge (STALE/LOST/NEAREST), +N extra count
- Contact-specific content:
  - **Remote ID:** Drone icon, model name, serial ID, distance/bearing
  - **FPV:** Band/frequency, RSSI, lock state, hit count
  - **Unknown:** Signal strength, notes
- Timestamp: right-aligned, relative format

**Severity Colors:**

- Critical: red-600
- High: orange-500
- Medium: amber-500
- Low: blue-500

**State Badges:**

- NEAREST: blue-600, uppercase
- STALE (15-60s old): amber-600/30, border
- LOST (>60s old): red-600/30, border

**Usage:** Contact lists (Home drawer, search results)

---

#### StatusBar

**File:** `/src/app/components/StatusBar.tsx`

**Position:** Fixed top
**Height:** 48-56px (normal), 72-80px (with critical banner)

**Elements:**

1. Critical badge (conditional)
2. Status chips (horizontal scroll)
3. Status button (right)

**Critical Banner:**

- Position: below status bar
- Height: 24px
- Background: red-600
- Text: "CRITICAL ALERT ACTIVE"

**Props:**

- `hasCriticalAlert`: boolean
- `esp32Status`: linked | offline
- `fpvScanState`: scanning | locked | hold | stopped
- `gpsStatus`: on | off
- `onOpenDrawer`: handler

**Usage:** Global top bar, always visible

---

#### TabBar

**File:** `/src/app/components/TabBar.tsx`

**Position:** Fixed bottom
**Height:** 64-76px

**Tabs:**

- Home (House icon)
- Alerts (Bell icon)
- Logs (Document icon)
- Settings (Gear icon)

**Active State:**

- Background: blue-600
- Text: white
- Border-radius: 16px (inner pill)

**Inactive State:**

- Background: transparent
- Text: slate-300

**Props:**

- `activeTab`: string
- `onTabChange`: handler

**Usage:** Global navigation

---

#### PanicControls

**File:** `/src/app/components/PanicControls.tsx`

**Position:** Fixed bottom, above tab bar
**Modes:** home | alerts | minimal

**Buttons (vary by mode):**

- Mute (blue, speaker icon)
- Ack / Ack All (slate-700, checkmark icon)
- Lock Strongest (amber, target icon, Home mode only)
- Stop Scan (red, stop icon, HOLD TO CONFIRM)

**Props:**

- `mode`: home | alerts | minimal
- `isMuted`: boolean
- `onToggleMute`: handler
- `onAck`: handler
- `onStopScan`: handler
- `onLockStrongest`: handler
- `isCollapsed`: boolean (collapses to icons only)

**Usage:** Context-aware quick actions

---

#### Badge

**File:** `/src/app/components/Badge.tsx`

**Types:**

- Type badge (Remote ID/FPV/Unknown)
- Severity badge (Critical/High/Medium/Low)

**Props:**

- `type`: remote-id | fpv | unknown (optional)
- `severity`: critical | high | medium | low (optional)
- `label`: string

**Colors:**

- Remote ID: purple-600
- FPV: pink-600
- Unknown: gray-600
- Critical: red-600
- High: orange-500
- Medium: amber-500
- Low: blue-500

**Size:** 11px font, px-2 py-1, rounded-lg

**Usage:** Contact cards, details sheet

---

#### BottomSheet

**File:** `/src/app/components/BottomSheet.tsx`

**Props:**

- `isOpen`: boolean
- `onClose`: handler
- `title`: string
- `children`: content

**Snap Points:**

- Partial: 60vh
- Full: 90vh

**Features:**

- Drag handle (top, centered)
- Backdrop (semi-transparent, click to close)
- Slide-up animation (300ms ease-out)
- Touch-drag to close

**Usage:** Contact details, modals

---

#### HoldButton

**File:** `/src/app/components/HoldButton.tsx`

**Props:**

- `label`: string
- `icon`: ReactNode
- `variant`: primary | secondary | danger
- `size`: sm | md | lg
- `holdDuration`: number (milliseconds)
- `onComplete`: handler
- `fullWidth`: boolean

**Behavior:**

- Press and hold to activate
- Shows progress fill during hold
- Cancels if released early
- Haptic feedback on complete (if supported)

**Usage:** Destructive actions (Stop Scan, Reboot)

---

#### DraggableDrawer

**File:** `/src/app/components/DraggableDrawer.tsx`

**Props:**

- `contactCount`: number
- `defaultSnap`: collapsed | mid | expanded
- `currentSnap`: string
- `onSnapChange`: handler
- `children`: drawer content

**Snap Points:**

- Collapsed: 80px (drag handle + title)
- Mid: 50vh (default)
- Expanded: 85vh

**Features:**

- Touch-drag to resize
- Snap to nearest point on release
- Velocity-based flick detection

**Usage:** Home screen contacts drawer

---

#### ReplayPanel

**File:** `/src/app/components/replay/ReplayPanel.tsx`

**Props:**

- `isExpanded`: boolean
- `onToggleExpanded`: handler

**Sub-components:**

- ReplayFilePicker
- TransportControls
- TimelineScrubber
- ReplayFilters

**State:**

- Selected file
- Current time
- Playback speed
- Loop enabled
- Filters
- Advanced options

**Usage:** Logs screen, Replay mode

---

#### TransportControls

**File:** `/src/app/components/replay/TransportControls.tsx`

**Buttons:**

- Play/Pause (toggle)
- Stop
- Restart
- Step Forward
- Loop (toggle)

**Speed Chips:**

- 0.25× | 0.5× | 1× | 2× | 5× | 10×

**Props:**

- `isPlaying`: boolean
- `onPlay`: handler
- `onPause`: handler
- `onStop`: handler
- `onRestart`: handler
- `onStepForward`: handler
- `loopEnabled`: boolean
- `onToggleLoop`: handler
- `playbackSpeed`: number
- `onSpeedChange`: handler

**Usage:** Replay panel

---

#### TimelineScrubber

**File:** `/src/app/components/replay/TimelineScrubber.tsx`

**Props:**

- `currentTime`: number (seconds)
- `duration`: number (seconds)
- `onSeek`: handler
- `markers`: TimelineMarker[]
- `fileStartTime`: Date

**Features:**

- Click to seek
- Drag playhead
- Marker icons (alerts, errors, ID changes)
- Time display (current / total)

**Markers:**

- Alert: AlertCircle (red)
- Location: MapPin (blue)
- ID Change: User (purple)
- Error: small dot (red)

**Usage:** Replay panel timeline

---

#### ReplayFilters

**File:** `/src/app/components/replay/ReplayFilters.tsx`

**Elements:**

- Search input
- Display toggles (Raw/Decoded/Errors/Stats)
- Event type chips (BasicID/Location/SelfID/System/OperatorID)
- "Only decoded contacts" checkbox

**Props:** Multiple state props + handlers

**Usage:** Replay panel filters section

---

### Missing Components (Recommendations)

**EmptyState:**

- Icon + title + subtitle
- Used in: no contacts, no alerts, no logs
- Consistent pattern needed

**Toast/Snackbar:**

- For confirmations ("Exported", "Acked", "Muted")
- Position: bottom-center, above panic controls
- Auto-dismiss after 3 seconds

**LoadingSpinner:**

- For async operations (loading map, loading replay file)
- Centered, blue-400 color

**ProgressBar:**

- For file uploads, long operations
- Used in: map pack downloads, video recording

---

## 5) Tokens + Theming

### Color Tokens

```css
:root {
  /* Backgrounds (60% - Dominant) */
  --bg-950: #0a0f1a; /* App shell background */
  --bg-900: #0f1419; /* Primary surface */
  --bg-850: #151b24; /* Elevated surface */
  --bg-800: #1a2230; /* Cards, inputs */
  --bg-750: #1f2838; /* Hover state */

  /* Borders/Dividers (30% - Secondary) */
  --border-700: #293548;
  --border-600: #3d4f66;

  /* Text/Foreground (10% - Accent) */
  --text-100: #f0f4f8; /* Primary text */
  --text-200: #dce3ed; /* Secondary text */
  --text-300: #b4c1d3; /* Tertiary text */
  --text-400: #8b9bb0; /* Muted text */
  --text-500: #5d7089; /* Disabled text */

  /* Semantic Colors */
  --critical: #dc2626;
  --high: #f97316;
  --medium: #f59e0b;
  --low: #3b82f6;

  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;

  /* Type Colors */
  --remote-id: #8b5cf6; /* Purple */
  --fpv: #ec4899; /* Pink */
  --unknown: #6b7280; /* Gray */
}
```

### Typography Scale

```css
:root {
  /* Fluid Typography (clamp for responsive scaling) */
  --font-display: clamp(1.75rem, 2.5vw, 2.25rem); /* 28-36px */
  --font-h1: clamp(1.5rem, 2.2vw, 1.875rem); /* 24-30px */
  --font-h2: clamp(1.25rem, 1.8vw, 1.5rem); /* 20-24px */
  --font-h3: clamp(1.125rem, 1.5vw, 1.25rem); /* 18-20px */
  --font-body-lg: clamp(1rem, 1.2vw, 1.125rem); /* 16-18px */
  --font-body: clamp(0.875rem, 1vw, 1rem); /* 14-16px */
  --font-body-sm: clamp(
    0.8125rem,
    0.9vw,
    0.875rem
  ); /* 13-14px */
  --font-caption: clamp(
    0.75rem,
    0.85vw,
    0.8125rem
  ); /* 12-13px */
  --font-micro: clamp(0.6875rem, 0.8vw, 0.75rem); /* 11-12px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Spacing Scale

```css
:root {
  /* 4px-based scale */
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
  --space-20: 5rem; /* 80px */
}
```

### Border Radius Scale

```css
:root {
  --radius-sm: 0.5rem; /* 8px - Small elements */
  --radius-md: 0.75rem; /* 12px - Inputs */
  --radius-lg: 1rem; /* 16px - Cards */
  --radius-xl: 1.25rem; /* 20px - Panels */
  --radius-2xl: 1.5rem; /* 24px - Buttons */
  --radius-full: 9999px; /* Pills/chips */
}
```

### Elevation/Shadows

```css
:root {
  /* Subtle shadows for dark theme */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.25);
  --shadow-sm: 0 2px 4px 0 rgb(0 0 0 / 0.3);
  --shadow-md:
    0 4px 8px -1px rgb(0 0 0 / 0.35),
    0 2px 4px -2px rgb(0 0 0 / 0.35);
  --shadow-lg:
    0 10px 15px -3px rgb(0 0 0 / 0.4),
    0 4px 6px -4px rgb(0 0 0 / 0.4);
  --shadow-xl:
    0 20px 25px -5px rgb(0 0 0 / 0.5),
    0 8px 10px -6px rgb(0 0 0 / 0.5);

  /* Performance-optimized */
  --shadow-subtle: 0 1px 3px 0 rgb(0 0 0 / 0.2);
  --shadow-card: 0 2px 4px 0 rgb(0 0 0 / 0.3);
}
```

### Icon Sizing

```css
:root {
  --icon-sm: 14px; /* Small chips, inline icons */
  --icon-md: 18px; /* Buttons, cards */
  --icon-lg: 20px; /* Headings, large buttons */
  --icon-xl: 24px; /* Hero icons, empty states */
}
```

### Dark/Light Mode

**Current Implementation:** Dark mode only

**Future Light Mode:** (tokens to swap)

```css
:root[data-theme="light"] {
  --bg-950: #ffffff;
  --bg-900: #f8f9fa;
  --bg-850: #f1f3f5;
  --bg-800: #e9ecef;
  --bg-750: #dee2e6;

  --border-700: #ced4da;
  --border-600: #adb5bd;

  --text-100: #212529;
  --text-200: #495057;
  --text-300: #6c757d;
  --text-400: #adb5bd;
  --text-500: #ced4da;

  /* Semantic colors stay same (high contrast maintained) */
}
```

**Mode Switching:**

- Settings screen: "Theme" selector (System / Dark / Light)
- Stored in localStorage: `theme` key
- Applied via data attribute: `<html data-theme="dark">`

**What Changes:**

- All `--bg-*` and `--text-*` tokens invert
- Semantic colors remain high-contrast
- Shadows reduce opacity in light mode
- Border colors lighten

**What Stays Consistent:**

- Spacing, typography, radius
- Component structure and layout
- Interactive states (hover/active)
- Semantic color meanings (red = danger)

---

## 6) Responsiveness Rules

### Breakpoints

```css
/* Small kiosks and portrait tablets */
@media (max-width: 800px) { ... }

/* Landscape kiosks and tablets */
@media (min-width: 801px) and (max-width: 1280px) { ... }

/* Desktop displays */
@media (min-width: 1281px) { ... }

/* Short screens (height constraint) */
@media (max-height: 600px) { ... }
```

### No Overlap Rule

**Verified at:** 360px, 768px, 1024px, 1280px, 1920px widths

**Enforced by:**

1. Flexbox column layout (no absolute positioning except map overlays)
2. Fixed header/footer with flex-1 scrolling content area
3. Min-height constraints on interactive elements
4. Overflow: auto on scrollable regions

### Max-Width Container

**Current (7" kiosk):** No max-width, full viewport used

**Future (desktop >1280px):**

```css
.content-container {
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}
```

Prevents "stretched stadium" look on wide monitors.

### Responsive Behavior Patterns

**Map Height:**

- Portrait (<800px): 40vh map, 60vh drawer
- Landscape (>800px): 60vh map, 40vh drawer
- Fullscreen mode: 100vh map, drawer collapsed

**Chips Wrapping:**

```css
.chips-scroll {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  flex-wrap: nowrap; /* Horizontal scroll on mobile */
}

@media (min-width: 801px) {
  .chips-scroll {
    flex-wrap: wrap; /* Stack on tablets/desktop */
  }
}
```

**Cards Stacking:**

- All cards stack vertically by default (flex-direction: column)
- Future: 2-column grid on wide screens (>1280px)

**Toolbar Wrapping:**

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
```

Buttons wrap to new line on narrow screens.

### Touch Target Enforcement

**Minimum:** 48px × 48px (WCAG AAA)
**Comfortable:** 56px × 56px (primary actions)

**Enforcement:**

```css
button,
a,
.interactive {
  min-height: 48px;
  min-width: 48px;
}

/* Primary actions */
.btn-primary {
  min-height: 56px;
}
```

### Grid/Flex Rules

**No absolute positioning except:**

- Map overlay controls (position: absolute within map container)
- Floating panic controls (position: fixed, bottom calculation)
- Status bar (position: fixed, top)
- Tab bar (position: fixed, bottom)

**Preferred patterns:**

```css
/* Page layout */
.screen {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.screen-header {
  flex-shrink: 0; /* Fixed height */
}

.screen-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* Two-column (future) */
.grid-2col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}
```

### Code Snippets

**Container + Grid:**

```css
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-shell-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

**Responsive Typography:**

```css
h1 {
  font-size: clamp(1.5rem, 2.2vw, 1.875rem);
  line-height: var(--leading-tight);
}

body {
  font-size: clamp(0.875rem, 1vw, 1rem);
  line-height: var(--leading-normal);
}
```

**Bottom Sheet Sizing:**

```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-900);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  transform: translateY(100%);
  transition: transform 300ms ease-out;
  z-index: 50;
}

.bottom-sheet.snap-partial {
  transform: translateY(40vh); /* 60% visible */
}

.bottom-sheet.snap-full {
  transform: translateY(10vh); /* 90% visible */
}

.bottom-sheet.open {
  transform: translateY(0);
}
```

---

## 7) Data Binding Map

### Global Telemetry Fields

```json
{
  "esp32": {
    "status": "linked | offline",
    "rssi": -45,
    "uptime": 302567
  },
  "fpv": {
    "scanning": true,
    "locked_channels": [
      { "band": "5.8GHz", "freq": 5860, "rssi": -68 }
    ]
  },
  "remote_id": {
    "active_contacts": 2,
    "last_update": 1642534789
  },
  "gps": {
    "lat": 37.7749,
    "lng": -122.4194,
    "alt": 52,
    "satellites": 12,
    "hdop": 1.2
  },
  "system": {
    "cpu_temp": 48,
    "battery_level": 87,
    "storage_free_gb": 45.2,
    "network_status": "WiFi",
    "uptime_seconds": 302567
  }
}
```

**UI Bindings:**

- Status Bar chips ← `esp32.status`, `fpv.scanning`, `gps.satellites > 0`
- Status Drawer ← all telemetry fields
- Settings/Diagnostics ← `system.*`
- Map HUD ← `gps.hdop`, `remote_id.last_update` (for age calculation)

---

### Contact Schema

```json
{
  "id": "rid-1",
  "type": "remote-id | fpv | unknown",
  "severity": "critical | high | medium | low",
  "last_seen": "2024-01-23T14:32:15Z",

  // Remote ID fields
  "model": "DJI Mavic 3",
  "serial_id": "DJI-M3-78A4B2",
  "drone_coords": { "lat": 37.7749, "lng": -122.4194, "alt": 120 },
  "pilot_coords": { "lat": 37.7750, "lng": -122.4195 },
  "home_coords": { "lat": 37.7751, "lng": -122.4196 },
  "distance": 245,
  "bearing": 142,

  // FPV fields
  "band": "5.8GHz",
  "frequency": 5860,
  "rssi": -68,
  "lock_state": "locked | scanning | hold",
  "threshold": "Balanced | Critical Focus",
  "hit_count": 142,

  // Unknown fields
  "signal_strength": 45,
  "notes": "Intermittent signal detected",

  // Common fields
  "is_pinned": true,
  "tags": ["priority", "commercial"]
}
```

**UI Bindings:**

- ContactCard ← all fields (type-specific rendering)
- Contact Details Sheet ← all fields (tabs)
- Map markers ← `drone_coords` (Remote ID only)
- Nearest calculation ← `distance` (Remote ID only)

---

### Alert Schema

```json
{
  "id": "alert-1",
  "contact_id": "rid-1",
  "severity": "critical | high | medium | low | info",
  "title": "Critical: New Remote ID Contact",
  "message": "DJI Mavic 3 detected at 245m",
  "timestamp": "2024-01-23T14:32:15Z",
  "status": "active | acknowledged | resolved"
}
```

**UI Bindings:**

- Critical Alert Banner ← `severity === 'critical' && status === 'active'`
- Alerts Screen list ← all alerts, grouped by `status`
- Alert card ← all fields
- Panic Controls badge counts ← filtered counts

---

### Log Entry Schema

```json
{
  "id": "log-1",
  "timestamp": "2024-01-23T14:32:15Z",
  "level": "info | warn | error",
  "source": "FPV Scanner | Remote ID | GPS | ESP32 | Storage",
  "message": "Channel scan completed, 3 signals detected",
  "tags": ["scan", "system"]
}
```

**UI Bindings:**

- Logs list ← all logs, filtered by `level` and `timestamp`
- Log entry row ← all fields
- Export ← filtered logs to CSV/JSON

---

### Replay Event Schema

```json
{
  "timestamp": 1642534789,
  "event_type": "BasicID | Location | SelfID | System | OperatorID | Error | Stats",
  "raw_data": "base64encodedpacket",
  "decoded_data": {
    // Varies by event_type
    "model": "DJI Mavic 3",
    "serial_id": "DJI-M3-78A4B2"
  },
  "decode_status": "success | crc_fail | timeout",
  "contact_id": "rid-1"
}
```

**UI Bindings:**

- Timeline markers ← `event_type`, `timestamp`, `decode_status === 'error'`
- Replay log list ← filtered events
- Decode health ← aggregated `decode_status` statistics
- Filters ← `event_type`, `decode_status`

---

## 8) Guardrails + Safety UX

### Dangerous Actions (Confirmation Required)

**Stop Scan:**

- Type: Hold-to-confirm (2 seconds)
- Visual: progress fill during hold
- Location: Panic Controls (all modes)
- Effect: Stops all scanning (ESP32, FPV, Remote ID)
- Reversible: Yes (can restart in Settings)

**Reboot Device:**

- Type: Hold-to-confirm (3 seconds)
- Visual: red button, progress fill, warning text
- Location: Settings → Power & Restart
- Effect: Full system reboot (Raspberry Pi)
- Reversible: No

**Reboot UI:**

- Type: Hold-to-confirm (2 seconds)
- Visual: progress fill
- Location: Settings → Power & Restart
- Effect: Restarts web UI only
- Reversible: Auto-restarts

**Delete Map Pack:**

- Type: Tap delete icon (no hold needed, but in safe context)
- Visual: red trash icon
- Location: Settings → Maps → Offline Packs
- Effect: Deletes map tiles (can be re-downloaded)
- Future: Add confirmation dialog

### REPLAY MODE Restrictions

**When in Replay Mode:**

**Disabled Actions:**

- Live scanning controls (Stop Scan button grayed out)
- Lock Strongest (no live FPV data)
- Real-time mute (mute states are replay-only)

**Visual Indicators:**

- REPLAY ACTIVE banner (top, amber background, always visible)
- Replay watermark on map (if map shown)
- "Exit Replay" button (right side of banner)

**Allowed Actions:**

- Export logs (from replay data)
- Navigate between screens
- View contact details (from replay data)
- Adjust replay controls (speed, filters, etc.)

**Exit Replay:**

- Tap "Exit Replay" button in banner
- Confirms if playback in progress (future)
- Returns to Live mode, clears replay state

### Stale Data Indicators

**Contact Cards:**

- **Stale (15-60s):** Amber "STALE" badge, amber border
- **Lost (>60s):** Red "LOST" badge, red border, grayed-out content

**Telemetry Age:**

- **Normal (<5s):** Green text, "2s" label
- **Warning (5-10s):** Amber text, "8s" label
- **Critical (>10s):** Red text, "12s" label, pulsing icon

**GPS Accuracy:**

- **Good (<2m):** Green, "±1.2m"
- **Fair (2-5m):** Amber, "±3.8m"
- **Poor (>5m):** Red, "±8.2m"

**Reconnect UX:**

- **ESP32 Offline:** Status chip red, "ESP32: Off"
- **No GPS:** Status chip amber, "GPS: No Fix"
- **No telemetry:** Status drawer shows "Reconnecting..." message
- Auto-retry: Backend retries connection, UI shows spinner

### AntSDR Settings Validation

**Step vs Sample Rate:**

```
validation: step_size <= sample_rate / 2
error: "Step size must be ≤ half of sample rate"
```

**TTL > Sweep Cycle Time:**

```
sweep_time = (num_steps * dwell_time) + overhead
validation: ttl_seconds >= sweep_time
error: "TTL must be ≥ sweep cycle time (calculated: X.Xs)"
```

**Step Count Limits:**

```
validation: 1 <= num_steps <= 1000
error: "Step count must be between 1 and 1000"
```

**Frequency Range:**

```
validation: start_freq < end_freq
validation: start_freq >= 50e6 && end_freq <= 6e9
error: "Frequency range must be within 50 MHz - 6 GHz"
```

**All Validation:**

- Inline errors (red text below input)
- Submit button disabled until valid
- Warning if settings will cause long sweep times

---

## 9) AUDIT: Issues Found + Fixes

### CRITICAL Issues

#### C1: No Replay Mode Watermark

**Where:** All screens when in Replay Mode
**Problem:** Operator could confuse replay data with live operations, creating safety risk
**Fix:**

- Add persistent REPLAY ACTIVE banner (amber bg, top of screen, z-index 45)
- Show "[filename.pcap] • [current time]" in banner
- Add "Exit Replay" button (right side, always visible)
- Disable live-only controls (Stop Scan, Lock Strongest) with grayed-out styling

#### C2: Contact Card Tap Targets Too Small in Badge Row

**Where:** ContactCard badges (type/severity/state)
**Problem:** Badges are decorative (11px font, small padding) but visually appear clickable. Card tap area not clear.
**Fix:**

- Entire card is tap target (already implemented)
- Badges non-interactive (already implemented)
- Add visual separation: badges in row, timestamp right-aligned
- Ensure card min-height 80px for comfortable tap

#### C3: Map Controls Overlap Possible on Small Screens

**Where:** Home screen map, portrait mode
**Problem:** Map HUD (top-left), Scan Widget (top-left), Compass (top-right), Tool Stack (right side), Map Mode (bottom-left), Selected Contact (bottom-left) can overlap when drawer expanded
**Fix:**

- Map HUD: absolute top-3 left-3
- Scan Widget: absolute top-[120px] left-3 (below HUD)
- Compass: absolute top-3 right-3
- Tool Stack: absolute right-3, vertically centered (dynamic positioning)
- Map Mode: absolute bottom-3 left-3
- Selected Contact: absolute bottom-[72px] left-3 (above map mode when active)
- When drawer at mid/expanded snap, tool stack shifts up to avoid overlap

#### C4: Critical Alert Banner Does Not Push Content

**Where:** All screens
**Problem:** Banner appears but content scrolls behind it (z-index layering issue)
**Fix:**

- Status bar height changes based on `hasCriticalAlert`
- Normal: 48-56px
- With banner: 72-80px (status bar + 24px banner)
- Content padding-top adjusts dynamically via CSS variable
- Banner is part of status bar component, not separate overlay

### MAJOR Issues

#### M1: Too Many Pill/Circle Buttons

**Where:** Panic Controls, all buttons full-pill radius (24px)
**Problem:** Every button looks equal weight, no hierarchy. "Stop Scan" (destructive) visually similar to "Mute".
**Fix:**

- Keep pill radius for primary actions (Mute, Ack)
- Change "Stop Scan" to rectangular with rounded corners (16px radius) to differentiate
- Add icon + color coding (red) + hold-to-confirm to emphasize danger
- Alternative: Keep pills but enforce strict color hierarchy (blue/gray/amber/red progression)

**Current Implementation Review:** Buttons correctly use color variants (blue/gray/amber/red), but shape is uniform. Recommend testing red + hold pattern first before changing shape.

#### M2: Drawer Handle Too Small

**Where:** DraggableDrawer (Home screen)
**Problem:** Drag handle is 40px wide, 4px tall – hard to grab with gloves or imprecise touch
**Fix:**

- Increase handle width to 60px
- Increase handle height to 6px
- Increase touch target height to 48px (entire top bar is draggable)
- Add subtle pulsing hint animation on first load

#### M3: Empty States Lack Actionable Guidance

**Where:** No contacts, no alerts, no logs, no map markers
**Problem:** Empty state shows icon + "No contacts detected" but doesn't guide operator to next action
**Fix:**

- No contacts: "No contacts detected. Ensure ESP32 is linked and scanning is active."
- No alerts: "All clear. No active alerts." (this is good, no action needed)
- No logs: "No events to display. Adjust time range or filters."
- No map markers: "Map View • Remote ID markers only • FPV/Unknown not plotted" ← already provides context, but could add "Enable Remote ID scanning in Settings"

#### M4: Filters Not Sticky

**Where:** All filter chips (Contacts, Alerts, Logs)
**Problem:** Filters reset when navigating away from screen. Operator loses context.
**Fix:**

- Persist filter state in sessionStorage or global state
- Restore filters on return to screen
- Add "Clear Filters" button when any non-default filter active

#### M5: No Loading States

**Where:** Contact list, map, alerts list, logs list
**Problem:** When data loads, screen is blank or stale. No spinner/skeleton.
**Fix:**

- Add LoadingSpinner component (centered, blue-400)
- Show spinner while fetching data
- Show skeleton cards while loading lists (3-5 gray placeholder cards)
- Timeout after 10s: show error state with retry button

### MINOR Issues

#### m1: Inconsistent Icon Sizes

**Where:** Various components use 14px, 16px, 18px, 20px, 24px icons inconsistently
**Problem:** Visual noise, not cohesive
**Fix:**

- Define icon size tokens: sm(14px), md(18px), lg(20px), xl(24px)
- Apply consistently:
  - Chips/small buttons: sm
  - Standard buttons: md
  - Headings: lg
  - Empty states/heroes: xl

**Current Implementation:** Uses Lucide icons with size prop. Audit all instances to use token sizes.

#### m2: Spacing Inconsistencies

**Where:** Card padding (sometimes 16px, sometimes 24px), section gaps (12px vs 16px)
**Problem:** Not using token system strictly
**Fix:**

- Audit all components
- Replace hardcoded px values with `var(--space-N)` tokens
- Enforce pattern:
  - Cards: `--space-6` (24px) padding
  - Section gaps: `--space-4` (16px)
  - Item gaps: `--space-3` (12px)

#### m3: Contrast Issues on Hover States

**Where:** Secondary buttons (slate-700 → slate-600 hover)
**Problem:** Hover state contrast ratio may fail WCAG AA on some displays
**Fix:**

- Test contrast ratios
- Darken hover state to slate-650 (create new token if needed)
- Increase border contrast on hover (slate-600 → slate-500)

#### m4: Map HUD Overlaps Compass on Narrow Screens

**Where:** Home screen, width <400px
**Problem:** HUD (top-left) and Compass (top-right) too close, can overlap on very narrow displays
**Fix:**

- Add media query for <400px:
  - Compass shifts to top-center or top-left below HUD
  - Or: Combine HUD and Compass into single compact widget

#### m5: Timestamp Format Inconsistent

**Where:** "30s ago" vs "2 minutes ago" vs "3h ago" vs absolute times
**Problem:** Mixing relative and absolute formats confuses operator
**Fix:**

- Define rules:
  - <60s: "Xs ago"
  - 1-59m: "Xm ago"
  - 1-23h: "Xh ago"
  - > 24h: "Jan 23, 14:32"
- Apply consistently everywhere (ContactCard, AlertCard, LogEntry)

---

## 10) Improvement Roadmap

### Phase 1: Token System + Components (1-2 weeks)

**Goals:**

- Establish strict design token system
- Build core component library with variants
- Enforce dark theme standards

**Tasks:**

- [ ] Audit all hardcoded colors → replace with CSS variables
- [ ] Audit all hardcoded spacing → replace with `--space-N` tokens
- [ ] Audit all font sizes → replace with `--font-*` tokens
- [ ] Create icon size tokens (--icon-sm/md/lg/xl)
- [ ] Build missing components:
  - [ ] EmptyState
  - [ ] Toast/Snackbar
  - [ ] LoadingSpinner
  - [ ] ProgressBar
- [ ] Document component variants in Storybook (optional)
- [ ] Create light mode theme (future-ready)

---

### Phase 2: Responsive Layout Rebuild (1-2 weeks)

**Goals:**

- Fix all overlap issues
- Ensure 360px → 1920px works perfectly
- Add max-width container for wide screens

**Tasks:**

- [ ] Fix map controls overlap (C3)
  - [ ] Implement dynamic tool stack positioning
  - [ ] Test at 360px, 768px, 1024px portrait/landscape
- [ ] Fix drawer handle (M2)
  - [ ] Increase size, test with gloves
- [ ] Add critical alert banner push (C4)
  - [ ] Test content padding adjustment
- [ ] Test all screens at breakpoints:
  - [ ] 360px (very narrow)
  - [ ] 768px (portrait tablet)
  - [ ] 1024px (landscape tablet)
  - [ ] 1280px (desktop)
  - [ ] 1920px (wide monitor)
- [ ] Add max-width container for >1280px
- [ ] Test wrapping (chips, toolbars, buttons)

---

### Phase 3: Screen Refactors (2-3 weeks)

**Goals:**

- Polish each screen
- Add loading/error/empty states
- Fix UX issues

**Tasks:**

- [ ] Home Screen:
  - [ ] Add replay watermark (C1)
  - [ ] Add loading states (M5)
  - [ ] Fix map HUD overlap (m4)
  - [ ] Test fullscreen map mode
- [ ] Alerts Screen:
  - [ ] Add empty state guidance (M3)
  - [ ] Add loading skeleton
  - [ ] Persist filters (M4)
- [ ] Logs Screen:
  - [ ] Complete Replay Panel integration
  - [ ] Add "Jump to Next Alert" (already done)
  - [ ] Add loading states
  - [ ] Persist filters
- [ ] Settings Screen:
  - [ ] Test all sliders/toggles
  - [ ] Add map pack download flow (stub)
  - [ ] Test AntSDR settings validation
- [ ] Contact Details Sheet:
  - [ ] Add loading state (when fetching contact)
  - [ ] Add error state (contact not found)
- [ ] Video Preview Overlay:
  - [ ] Add loading spinner
  - [ ] Add error state (stream unavailable)

---

### Phase 4: Polish + QA (1 week)

**Goals:**

- Audit all interactions
- Test accessibility
- Performance optimization

**Tasks:**

- [ ] Audit icon consistency (m1)
- [ ] Audit spacing consistency (m2)
- [ ] Test contrast ratios (m3)
- [ ] Standardize timestamp format (m5)
- [ ] Add toast notifications (M5)
- [ ] Test touch targets (all ≥48px)
- [ ] Test keyboard navigation (focus rings)
- [ ] Test with gloves (Settings → Glove Mode)
- [ ] Test Performance Mode (disable animations)
- [ ] Test on real Raspberry Pi (not just browser)
- [ ] Test in bright sunlight (brightness slider)
- [ ] Test night mode (dark theme contrast)

---

### QA Checklist (Must Pass Before "Done")

#### Visual Hierarchy

- [ ] Critical alerts immediately visible (red banner)
- [ ] Primary actions distinct from secondary (color + size)
- [ ] Destructive actions clearly marked (red + hold-to-confirm)
- [ ] Severity color coding consistent (red/orange/amber/blue)

#### Responsiveness

- [ ] No overlaps at 360px, 768px, 1024px, 1280px, 1920px
- [ ] Map + drawer layout works in portrait and landscape
- [ ] All chips wrap or scroll (no horizontal overflow)
- [ ] Toolbars wrap on narrow screens
- [ ] Content scrolls within safe area (not behind bars)

#### Touch Targets

- [ ] All interactive elements ≥48px tap height
- [ ] Primary buttons ≥56px tap height
- [ ] Minimum 8px spacing between tap targets
- [ ] Drawer handle ≥60px wide, touch area ≥48px tall

#### Typography

- [ ] All text ≥12px (minimum readable)
- [ ] Headings use correct scale (h1/h2/h3)
- [ ] Body text uses --font-body (14-16px)
- [ ] Timestamps use consistent format

#### Contrast

- [ ] Text meets 4.5:1 contrast (WCAG AA)
- [ ] Icons/components meet 3:1 non-text contrast
- [ ] Hover states visible and meet contrast
- [ ] Disabled states visually distinct

#### Theming

- [ ] Dark mode looks intentional (not inverted trash)
- [ ] Semantic colors high-contrast
- [ ] Light mode ready (tokens swappable)

#### Interactions

- [ ] Destructive actions require hold (2-3s)
- [ ] REPLAY MODE disables live actions
- [ ] Stale data indicators visible (STALE/LOST badges)
- [ ] Loading states show spinner/skeleton
- [ ] Empty states provide guidance

#### Data Flow

- [ ] Contact data binds correctly (type-specific fields)
- [ ] Alerts group by status (Active/Acked/Resolved)
- [ ] Logs filter by time/level
- [ ] Replay events render timeline markers
- [ ] Telemetry updates status bar chips

#### Edge Cases

- [ ] No GPS: shows "No Fix" state
- [ ] No contacts: shows empty state
- [ ] No alerts: shows "All Clear"
- [ ] Map offline: shows offline mode
- [ ] Video unavailable: shows error state

#### Performance

- [ ] No jank when scrolling lists
- [ ] Animations smooth at 60fps (or disabled in performance mode)
- [ ] No layout shift on load
- [ ] Images lazy-load (if used)

#### Accessibility

- [ ] Keyboard navigation works (tab, enter, esc)
- [ ] Focus rings visible
- [ ] Button labels screen-reader friendly
- [ ] Alt text on icons (aria-label)

---

## End of Specification

This document provides a complete "UI in words" specification for N-Defender. Any engineer should be able to implement the UI from this document without seeing the Figma file or codebase.

**Key Takeaways:**

1. **Operator-first:** Safety + clarity over prettiness
2. **Responsive:** 360px → 1920px, no overlaps
3. **Touch-safe:** ≥48px targets, wrapping layouts
4. **Consistent:** Tokens for colors/spacing/typography/radius
5. **Contextual:** Panic Controls adapt to screen, Replay Mode visually distinct
6. **Accessible:** Contrast ratios, keyboard nav, glove mode

**Next Steps:**

- Review Phase 1-4 roadmap
- Prioritize critical issues (C1-C4)
- Run QA checklist before each release