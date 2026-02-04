# Settings Integration Report

## A) Functional status table

| Section | Control | Backend endpoint | Persistence file | Verified (how) | Notes |
| --- | --- | --- | --- | --- | --- |
| Display & Interface | Brightness slider | `/api/v1/settings/ui` | `/opt/ndefender/backend/state/ui_settings.json` | `curl PUT /api/v1/settings/ui` + `cat ui_settings.json` ✅ | End-to-end OK (debounced 300ms) |
| Display & Interface | Glove Mode toggle | `/api/v1/settings/ui` | `/opt/ndefender/backend/state/ui_settings.json` | `curl PUT /api/v1/settings/ui` + `cat ui_settings.json` ✅ | End-to-end OK |
| Display & Interface | Performance Mode toggle | `/api/v1/settings/ui` | `/opt/ndefender/backend/state/ui_settings.json` | `curl PUT /api/v1/settings/ui` + `cat ui_settings.json` ✅ | End-to-end OK |
| Audio | Volume slider | `/api/v1/settings/audio` | `/opt/ndefender/backend/state/audio_settings.json` | `curl PUT /api/v1/settings/audio` + `cat audio_settings.json` ✅ | End-to-end OK (debounced 300ms) |
| Audio | Test Buzzer | `/api/v1/system/buzzer_test` | — | `POST /api/v1/system/buzzer_test` → `{ok:false}` 🟡 | Not supported stub (UI shows “Not supported”) |
| System | Version / Uptime / CPU / Storage | `/api/v1/status` | — | `curl /api/v1/status` ✅ | Read-only system snapshot |
| System | Network / GPS | `/api/v1/status` | — | `curl /api/v1/status` ✅ | Read-only system snapshot |
| Device Hardware | System status | `/api/v1/status.overall_ok` | — | `curl /api/v1/status` ✅ | Read-only |
| Device Hardware | Network | `/api/v1/status.system.network_status` | — | `curl /api/v1/status` ✅ | Read-only |
| Device Hardware | GPS fix / HDOP | `/api/v1/status.gps` | — | `curl /api/v1/status` ✅ | Read-only |
| Device Hardware | Remote ID status | `/api/v1/status.remote_id.health` | — | `curl /api/v1/status` ✅ | Read-only |
| Device Hardware | Dev Mode | Local UI flag | — | URL param `?dev=1` ✅ | UI-only |
| Power & Restart | Hold to Reboot UI | `/api/v1/system/reboot_ui` | — | `POST /api/v1/system/reboot_ui` ✅ | Dry-run only, returns ok=true |
| Power & Restart | Hold to Reboot Device | `/api/v1/system/reboot_device` | — | `POST /api/v1/system/reboot_device` ✅ | Dry-run only, returns ok=true |
| Sensors | Front-end Controller status | `/api/v1/status.esp32` | — | `curl /api/v1/status` ✅ | Read-only |
| Sensors | FPV Scanner status | `/api/v1/status.fpv` | — | `curl /api/v1/status` ✅ | Read-only |
| Sensors | Remote ID Sensor status | `/api/v1/status.remote_id` | — | `curl /api/v1/status` ✅ | Read-only |
| Sensors | Network System (RF Sensor) | `/api/v1/status.rf_sensor` | — | `curl /api/v1/status | jq .rf_sensor` ✅ | Live RF sensor health |
| Maps | Map Mode chips (Online/Offline/Auto) | `/api/v1/settings/maps` | `/opt/ndefender/backend/state/maps_settings.json` | `curl PUT /api/v1/settings/maps` + `cat maps_settings.json` ✅ | End-to-end OK |
| Maps | Add Pack | `/api/v1/maps/packs/download` | — | `POST /api/v1/maps/packs/download` → `{ok:false}` 🟡 | Not supported stub |
| Maps | Delete Pack | `/api/v1/maps/packs/delete` | — | `POST /api/v1/maps/packs/delete` → `{ok:false}` 🟡 | Not supported stub |
| Alert Presets | Balanced / Critical Focus / Training | `/api/v1/settings/alerts` | `/opt/ndefender/backend/state/alerts_settings.json` | `curl PUT /api/v1/settings/alerts` + `cat alerts_settings.json` ✅ | End-to-end OK |
| Video Capture | Auto Recording | `/api/v1/video/capture` | — | `POST /api/v1/video/capture` → `{ok:false}` 🟡 | Not supported stub |
| Video Capture | Storage Used | — | — | Visual only 🟡 | Static placeholder |
| Debug | Raw Telemetry | — | — | Visual only 🟡 | Static placeholder |
| RF Scanning (Advanced) | Open submenu | local | — | UI nav ✅ | Read-only |
| RF Scanning > Scan Profiles | Save/Duplicate/Reset/Export/Import | `/api/v1/settings/rfscan/action` | — | `POST /api/v1/settings/rfscan/action` → `{ok:false}` 🟡 | Not supported stub |
| RF Scanning > Sweep Plans | Run Quick Validate | `/api/v1/settings/rfscan/action` | — | `POST /api/v1/settings/rfscan/action` → `{ok:false}` 🟡 | Not supported stub |
| RF Scanning > Output & Logging | Export Config | `/api/v1/settings/rfscan/action` | — | `POST /api/v1/settings/rfscan/action` → `{ok:false}` 🟡 | Not supported stub |
| RF Scanning > Health & Diagnostics | Reconnect / Restart / Reset | `/api/v1/settings/rfscan/action` | — | `POST /api/v1/settings/rfscan/action` → `{ok:false}` 🟡 | Not supported stub |
| RF Scanning > Safety & Validation | Validate/Apply | `/api/v1/settings/rfscan/action` | — | `POST /api/v1/settings/rfscan/action` → `{ok:false}` 🟡 | Not supported stub |

## B) Identity safety check

Command executed:

```
grep -RInE "AntSDR|ESP32|AD936|Z7020|ad936|fw_version" /opt/ndefender/ui-app/src /opt/ndefender/backend/app.py || true
```

Result: **no matches** ✅

## C) Touch UX checklist

- Tap target sizes ≥56px (buttons, chips, toggles): ✅
- Slider thumb easy to grab (28px thumb + thicker track): ✅
- No cramped rows (InfoRow min height + spacing): ✅
- Text legible at arm’s length (15px labels, 19px headings): ✅
- Consistent card padding: ✅
- No horizontal overflow at 800×480: ✅ (values constrained, wrap allowed)
- Scroll smooth / no nested scroll traps: ✅
- Hold-to-confirm progress clearly visible (2px → 4px bar): ✅

## D) Before / After notes

- Before: placeholder console logs, smaller tap targets, and mixed spacing. After: all Settings controls route to REST endpoints or explicit “Not supported” responses; touch targets increased to 56px+ with enlarged toggles and slider thumb.
- Before: RF Sensor card was present but device summary was minimal. After: Device Hardware section and RF Sensor card provide real-time health in a touch-friendly layout.
