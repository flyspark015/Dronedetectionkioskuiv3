# N-Defender UI — System Guidelines (guidance.md)

Use this file as **non-negotiable rules** for redesigning the N-Defender UI.
The goal: **clean, professional, mission-critical UI** that works on **7" kiosk, Android tablets, and large desktop monitors** without stretching, overlap, or childish styling.

---

## 0) Product reality (read first)

This UI is **operator-first**, not “pretty dashboard-first”.

**Priorities (in order):**

1. **Safety + clarity** (critical alerts + panic actions are always obvious)
2. **Speed** (tap targets, low cognitive load, 2-step actions max)
3. **Consistency** (components look/behave predictably everywhere)
4. **Responsiveness** (no overlaps at any resolution)
5. **Polish** (modern visual system, not toy-like)

**Never:**

- Make every control a circle/pill.
- Use fixed pixel layouts that stretch weirdly on big screens.
- Hide critical actions inside menus.
- Let map or panels overlap primary controls.

---

## 1) Current UI audit (what’s wrong and must be fixed)

### Visual hierarchy failures

- Everything is a **rounded pill/circle**, so nothing looks more important than anything else.
- Buttons, chips, and status indicators visually blend together.

### Layout + responsiveness failures

- Layout stretches on large monitors, creating empty space and misalignment.
- Some components overlap or fight for space (map, contact list, floating controls).
- Too much “dead space” (especially map area), while content is cramped elsewhere.

### Component system failures

- No consistent sizing rules (padding, radius, typography, elevation).
- Same shape used for different meanings (button vs chip vs status badge).

**Redesign outcome required:**

- Clear hierarchy: **Status → Page actions → Content → Secondary controls**
- Responsiveness: **no overlap at 360px → 1920px**
- Component system: **tokens + reusable components + variants**

---

## 2) Layout strategy (responsive, not fixed)

### Supported breakpoints

Design and test at these widths (minimum):

- **360** (small phone)
- **768** (portrait tablet)
- **1024** (landscape tablet)
- **1280** (desktop)
- **1440–1920** (wide monitor)

### Container rule (prevents “stretched look”)

- Use a **max content width** for readable UI.
- Background can expand, but content should not become a “wide empty stadium”.

**Rule:**

- Main content container: `max-width: 1200–1360px` (desktop)
- Center content with side gutters that grow on wide screens.
- Map can be full-bleed _only if_ UI overlays remain aligned and readable.

### Page layouts (adaptive)

**A) Compact mode (phones/tablets):**

- Bottom tab nav (Home / Alerts / Logs / Settings)
- Home = Map + Contacts list (stacked)
- Details = Bottom sheet (slide-up)

**B) Wide mode (desktop/large monitor):**

- Left navigation rail (icons + labels optional) OR top nav (pick ONE)
- 2-pane layout:
  - Left: Contacts list / Alerts list
  - Right: Map + Details panel (or Map top, details bottom)

**Never show both bottom tabs + left rail at the same time.**
On wide screens, bottom tabs can become “compact rail” or disappear.

---

## 3) Spacing system (stop randomness)

Use an **8-point spacing system** everywhere.

### Spacing tokens

- `4` (micro)
- `8` (base)
- `12` (tight)
- `16` (standard)
- `24` (section)
- `32` (page)
- `48` (large)

### Component padding defaults

- Buttons: `12–16px` horizontal, `10–12px` vertical
- Cards: `16–20px` padding
- List rows: `12–16px` vertical padding
- Page gutters: `16` (mobile), `24` (tablet), `32` (desktop)

---

## 4) Touch + click targets (no tiny controls)

This UI is touch-first. Minimum interactive size:

- **Height/width ≥ 48px** for any tap target (buttons, icons, chips, toggles)
- Minimum spacing between tap targets: **≥ 8px**

If space is tight, increase row height — don’t shrink buttons.

---

## 5) Typography system (no guessing)

### Font

Use one neutral UI font (Inter / System UI / Roboto). Keep it consistent.

### Type scale (recommended)

- **Display / Page title:** 24–28
- **Section title:** 18–20
- **Body:** 14–16
- **Meta / labels:** 12–13 (never below 12)
- **Numbers / telemetry:** 16–20 (use tabular/monospace variant if possible)

### Line height

- Titles: `1.2–1.3`
- Body: `1.4–1.6`

### Weight rules

- Use weight for hierarchy, not random bold everywhere:
  - Title: 600–700
  - Body: 400–500
  - Meta: 400

---

## 6) Color system (dark + light mode, professional)

### Core rule

Define colors as **tokens**, not hard-coded values.
Support two themes:

- `theme-dark`
- `theme-light`

### Surfaces (recommended)

- Dark theme: use **near-black** backgrounds (not pure black), layered surfaces.
- Light theme: use warm/cool neutral backgrounds, clear dividers.

### Semantic colors (restricted palette)

Only these should be “loud”:

- **Critical** (red)
- **Warning** (amber)
- **Success** (green)
- **Info** (blue)

Everything else stays neutral.

### Contrast rules

- Normal text must meet **4.5:1** contrast minimum.
- UI components + icons must meet **3:1** non-text contrast.

### Theme switching

Settings must include:

- Theme: **System / Dark / Light**
- Persist selection across reboot (local storage/config).

---

## 7) Shape + radius + elevation (stop “childish pills”)

### Radius rules

Pick ONE radius system and stick to it:

- Small elements: `8–10`
- Cards / panels: `12–16`
- Bottom sheet: `16–24`

**No full pills for everything.**
Use pills only for:

- Chips (filters)
- Small status badges

### Elevation rules

Use subtle elevation only when needed:

- Cards: low shadow / border
- Floating controls: moderate
- Modals/sheets: strongest

Avoid heavy “neumorphism” blur everywhere — it looks dated and reduces clarity.

---

## 8) Component rules (must be consistent)

### Buttons (variants)

Create a single Button component with variants:

1. **Primary**

- Filled, highest emphasis
- Use for the main action in a context

2. **Secondary**

- Outline or tinted
- Supporting actions

3. **Tertiary**

- Ghost/text
- Low emphasis actions

4. **Destructive**

- Red, used only for Stop Scan / Panic / Reset-like actions

**Rules:**

- One Primary per container max.
- Destructive actions must be visually distinct AND require confirm/hold when high risk.

### Chips (filters + tags)

- Chips are for filtering (All / Remote ID / FPV / Unknown / Pinned / Tagged).
- Selected state must be unmistakable (background + text change).
- Chips must wrap gracefully (no overflow).

### Status indicators (top bar)

Use small, readable status pills:

- ESP32 link, scan state, GPS fix, storage, mute.
  Each should have:
- icon + label + state color
- consistent spacing
  Do NOT make the status bar tall or dominant.

### Cards (contacts + alerts)

Cards must have a consistent structure:

**Contact card layout**

- Left: severity bar (color-coded)
- Main: Title (Model/Type) + ID/serial
- Meta row: distance/bearing (if available) + last seen
- Right: quick actions (lock/preview/more) — icons with tooltips

**Alert card layout**

- Severity badge + title + time
- Body text (1–2 lines)
- Action row: Ack / Mute / View details

### Bottom sheet / details panel

Details must open as:

- **Bottom sheet** (compact mode)
- **Side panel** (wide mode)

Tabs inside details:

- Overview / Data / Actions / History

Must support:

- drag handle
- 3 snap points (collapsed / half / full)
- never cover panic controls completely

---

## 9) Page-by-page design requirements (new plan)

### Home

**Goal:** Map-first, but not empty or wasted.
Layout:

- Top: Map (with markers only when coords exist)
- Below: Contacts list (scroll)
- Search + filter chips above list
- Counters: Active / Critical / Remote ID / FPV

Rules:

- If no markers → show helpful empty state, not giant blank map.
- Map controls: group, align, and avoid stacking random circles.

### Alerts

Layout:

- Header: counts (Active / Acked / Resolved)
- Actions: Ack all, Mute, Mute FPV, Mute RID
- List grouped by status (Active → Acked → Resolved)
- Sticky “Stop Scan” / Panic area must be visible (or safely docked)

### Logs

Layout:

- Filters: time range chips (15m/1h/6h/24h/All), level (Info/Warn/Error)
- Export buttons: CSV / JSON
- List rows: icon + event + time + tags
- Detail drawer for a selected log event

### Settings / Diagnostics

Must look like a real product settings page:

- Left: section navigation (or anchored headings)
- Right: settings forms
- Use proper form components:
  - toggles, selects, sliders, input rows, helper text
- Avoid giant full-width red bars unless it’s a confirmed destructive action.

Theme switch must exist here.

---

## 10) Interaction rules (operator UX)

- Any “dangerous” action (Stop Scan, Panic, Reset) must be:
  - red
  - separated from normal actions
  - require confirm OR press-and-hold (recommended)
- Provide feedback within 100–300ms (pressed state).
- Use toast/snackbar for “Acked”, “Exported”, “Muted”.
- Use clear stale-data indicators if telemetry stops updating.

---

## 11) Accessibility + keyboard basics (non-optional)

- Visible focus ring for keyboard navigation (web/desktop).
- Buttons and icons must have labels/aria text.
- Don’t rely on color alone; add icons + text for severity.

---

## 12) Implementation rules (CSS/React/HTML)

- Default to **flex + grid**. Avoid absolute positioning except:
  - map overlay controls
  - floating panic cluster (if required)
- Use `clamp()` for responsive font sizing where helpful.
- Use CSS variables for tokens:
  - `--bg`, `--surface-1`, `--surface-2`, `--text`, `--muted`, `--border`, `--primary`, `--critical`, etc.
- Avoid heavy blur/shadows in performance mode (Pi/low GPU).

---

## 13) Figma execution rules (so design becomes buildable)

- Use **Auto Layout** for:
  - cards, lists, rows, chips, toolbars, panels
- Use **Constraints** correctly:
  - left/right pinning
  - fill container where needed
- Build components with variants:
  - Button (primary/secondary/ghost/destructive, sizes)
  - Chip (default/selected/disabled)
  - Card (contact/alert/log)
  - Status pill (ok/warn/critical/offline)
- Use Variables / Modes for themes:
  - Same components swap values for dark/light automatically
- Name layers/components cleanly:
  - `Button/Primary/LG`, `Chip/Selected`, `Card/Contact`, etc.

---

## 14) Quality gate (must pass before “done”)

Before marking UI redesign complete, verify:

✅ No overlaps at 360 / 768 / 1024 / 1280 / 1920  
✅ Touch targets ≥ 48px  
✅ Typography readable (min 12px)  
✅ Contrast passes (text 4.5:1, icons/components 3:1)  
✅ Dark + light mode look intentional (not inverted trash)  
✅ One clear hierarchy per screen  
✅ Destructive actions are visually isolated + confirmed  
✅ Lists scroll correctly, panels snap correctly, no clipped content  
✅ Layout looks “designed”, not “stretched”

---

## 15) Step-by-step redesign TODO (follow in order)

### Phase 1 — Build the system

- [ ] Define tokens: spacing, type scale, radius, elevations, semantic colors
- [ ] Create light/dark modes via variables
- [ ] Create base components (Button/Chip/Card/Status/Sheet)

### Phase 2 — Fix layout responsiveness

- [ ] Implement container max-width + responsive gutters
- [ ] Define compact vs wide mode layouts
- [ ] Replace any fixed/absolute layout causing stretching

### Phase 3 — Redesign each screen

- [ ] Home: map + contacts + details panel rules
- [ ] Alerts: grouping + actions + safe destructive flow
- [ ] Logs: filters + export + detail drawer
- [ ] Settings: true settings layout + theme switch

### Phase 4 — Polish + QA

- [ ] Consistent icon set + alignment
- [ ] Micro-interactions (pressed, loading, empty states)
- [ ] Final pass for spacing, contrast, typography, performance

---

## 16) Allowed research + references (do it)

You have permission to:

- Look up modern dashboard patterns (kiosk, maps, monitoring UIs)
- Use official guidelines (Material, WCAG, platform HIGs)
- Reference component libraries/docs for best practices
  But:
- Do not copy UI pixel-for-pixel.
- Build a coherent system for N-Defender.

End of guidelines.