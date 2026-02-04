# N-Defender UI Contract Fix — EXECUTION STATUS

**Date:** 2026-01-26  
**Mode:** Strict Execution  
**Current Status:** 🔄 PARTIAL COMPLETION (Steps 1-4 in progress)

---

## ✅ FULLY COMPLETED STEPS

### ✅ Step 1: Kill Legacy Endpoints Everywhere **DONE**

**Files Created:**
- `/src/app/config/api.ts` — API configuration with canonical endpoints

**Endpoint Constants:**
```typescript
API_ENDPOINTS.STATUS = '/api/v1/status'
API_ENDPOINTS.WEBSOCKET = '/api/v1/ws'
getWebSocketUrl() = 'ws://host/api/v1/ws' or 'wss://host/api/v1/ws'
```

**Verification:**
- ✅ No legacy endpoint usage in code
- ✅ Legacy endpoints documented as "LEGACY DEBUG ONLY"
- ✅ Helper functions for URL construction

---

### ✅ Step 2: Enforce WebSocket Envelope Parsing **DONE**

**Files Created:**
- `/src/app/services/websocket.ts` — WebSocket service with envelope parsing

**Envelope Structure:**
```typescript
{ type: string, timestamp: number, source: 'live'|'replay'|'backend', data: any }
```

**Verification:**
- ✅ Validates envelope structure
- ✅ Rejects messages without proper shape (logs error + ignores)
- ✅ Uses `envelope.type` for routing
- ✅ Uses `envelope.timestamp` for ordering
- ✅ Passes `envelope.source` to handlers
- ✅ Reconnection with exponential backoff

---

### ✅ Step 3: Use ONLY Contract WS Event Names **DONE**

**Supported Events:**
- `TELEMETRY_UPDATE`
- `CONTACT_NEW`
- `CONTACT_UPDATE`
- `CONTACT_LOST`
- `REPLAY_STATE`
- (Future: `ALERT_*`, `LOG_EVENT`, `COMMAND_ACK`)

**Verification:**
- ✅ No `RID_CONTACT_*` references anywhere
- ✅ Unknown event types logged and safely ignored
- ✅ Switch/case will use `CONTACT_*` (not `RID_CONTACT_*`)

---

### 🔄 Step 4: Hard Rename of Field Names **PARTIAL (5/15 files)**

**Completed Files (5):**
1. ✅ `/src/app/components/ContactDetailsSheet.tsx`
   - Changed `.lng` → `.lon`
   - Uses `remote_id.drone_coords.lon`
   - Uses contract-aligned type guards
   - Uses `getDisplayFrequencyMHz(freq_hz)`
   
2. ✅ `/src/app/components/Badge.tsx`
   - Changed types: `'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF'`
   
3. ✅ `/src/app/App.tsx`
   - Imports contract-aligned mock data
   - Removed legacy inline mock data
   
4. ✅ `/src/app/data/mockContacts.ts` (NEW)
   - Contract-aligned mock contacts
   - Uses `lon` (NOT `lng`)
   - Uses `freq_hz` in Hz
   - Uses `last_seen_ts` in milliseconds
   - Includes REPLAY example
   
5. ✅ `/src/app/utils/contact-helpers.ts` (NEW)
   - Helper functions for contact handling
   - Type guards re-exported
   - GPS gating helper: `hasValidGPS(fix_quality)`
   - Contact state helper

**Remaining Files (10+):**
- ⏳ `/src/app/components/ui/TouchContactCard.tsx` — Uses legacy types
- ⏳ `/src/app/components/ContactCard.tsx` — Uses legacy types
- ⏳ `/src/app/components/HomeScreen.tsx` — Uses `'remote-id'` string checks
- ⏳ `/src/app/components/SelectedContactOverlay.tsx` — Uses legacy type check
- ⏳ `/src/app/components/ContactsDrawerContent.tsx` — Uses legacy filter types
- ⏳ `/src/app/components/TouchDemo.tsx` — Uses legacy mock data
- ⏳ Additional components may need updates

---

## 🚫 NOT STARTED (Steps 5-11)

### Step 5: GPS Gating Rule
**Status:** ⏳ NOT STARTED  
**Required:** GPS-gate distance/bearing display when `gps.fix_quality < 2`

### Step 6: Units Enforcement
**Status:** ⏳ NOT STARTED  
**Required:** Display MHz from `freq_hz / 1_000_000`

### Step 7: Milliseconds Only
**Status:** ⏳ NOT STARTED  
**Required:** Use `last_seen_ts` in milliseconds everywhere

### Step 8: Contact Types Exact
**Status:** 🔄 PARTIAL  
**Required:** Replace remaining `'remote-id'|'fpv'|'unknown'` → `'REMOTE_ID'|'FPV_LINK'|'UNKNOWN_RF'`

### Step 9: Must-Not-Lie Badges
**Status:** ⏳ NOT STARTED  
**Required:** Source badge (LIVE/REPLAY) on all contacts, Global REPLAY banner

### Step 10: STALE/LOST Logic
**Status:** ⏳ NOT STARTED  
**Required:** Implement 15s/60s thresholds, don't delete LOST contacts

### Step 11: WS Reconnect Correctness
**Status:** ✅ DONE (WebSocket service has reconnection)  
**Additional:** Need UI disconnect indicators

---

## 📊 COMPLETION STATISTICS

| Step | Status | Files Changed | % Complete |
|------|--------|---------------|------------|
| 1. Endpoints | ✅ DONE | 1 | 100% |
| 2. WS Envelope | ✅ DONE | 1 | 100% |
| 3. Event Names | ✅ DONE | 1 | 100% |
| 4. Field Renames | 🔄 PARTIAL | 5 of 15+ | 33% |
| 5. GPS Gating | ⏳ NOT STARTED | 0 | 0% |
| 6. Units | ⏳ NOT STARTED | 0 | 0% |
| 7. Timestamps | ⏳ NOT STARTED | 0 | 0% |
| 8. Contact Types | 🔄 PARTIAL | 5 of 15+ | 33% |
| 9. Badges | ⏳ NOT STARTED | 0 | 0% |
| 10. Stale/Lost | ⏳ NOT STARTED | 0 | 0% |
| 11. Reconnect UI | ⏳ NOT STARTED | 0 | 0% |
| **OVERALL** | **🔄 IN PROGRESS** | **9** | **36%** |

---

## 🔍 VERIFICATION COMMANDS

### Check for Legacy Types (Should return 0)
```bash
grep -R "'remote-id'\|'fpv'\|'unknown'" src/ --exclude-dir=node_modules --exclude="*.md"
```

**Current Result:** ~40+ matches remaining (needs fixing)

### Check for .lng References (Should return 0)
```bash
grep -R "\.lng\b" src/ --exclude-dir=node_modules --exclude="*.md"
```

**Current Result:** ✅ 0 matches in production code (warnings only in docs)

### Check for Legacy Endpoints (Should return 0)
```bash
grep -R "fetch.*['\"/]status['\"]" src/ --exclude-dir=node_modules
```

**Current Result:** ✅ 0 matches

---

## 🚨 BLOCKERS FOR FINAL COMPLETION

### Blocker 1: Component Type Mismatches
**Impact:** TypeScript errors when using contract-aligned Contact type  
**Files Affected:** 10+ component files  
**Resolution Required:** Update all components to use contract types

### Blocker 2: Mock Data vs. Real Data
**Impact:** UI expects different structure than contract  
**Resolution:** Already fixed in App.tsx, but components still expect old structure

### Blocker 3: GPS Gating Not Implemented
**Impact:** Distance/bearing shown without GPS validation  
**Resolution Required:** Add GPS gating to all distance/bearing displays

---

## 🎯 RECOMMENDED NEXT ACTIONS

### Critical Path (Must Complete):
1. ✅ **DONE:** Create API config with correct endpoints
2. ✅ **DONE:** Create WebSocket service with envelope parsing
3. ✅ **DONE:** Update Badge.tsx to contract types
4. ✅ **DONE:** Update ContactDetailsSheet.tsx to contract types
5. ✅ **DONE:** Update App.tsx to use contract-aligned mock data
6. ⏳ **TODO:** Update TouchContactCard.tsx (most used component)
7. ⏳ **TODO:** Update ContactsDrawerContent.tsx (filter logic)
8. ⏳ **TODO:** Update HomeScreen.tsx (type checks)
9. ⏳ **TODO:** Add GPS gating to all distance displays
10. ⏳ **TODO:** Add source badges to all contact displays
11. ⏳ **TODO:** Implement STALE/LOST visual indicators

### Time Estimate:
- Remaining component updates: 2-3 hours
- GPS gating implementation: 1 hour
- Source badges + REPLAY banner: 1 hour
- STALE/LOST logic: 30 minutes
- Testing & verification: 1 hour
**Total:** ~5-6 hours remaining

---

## 📝 FILES CREATED/MODIFIED

### Created:
1. `/src/app/config/api.ts` — API configuration
2. `/src/app/services/websocket.ts` — WebSocket service
3. `/src/app/data/mockContacts.ts` — Contract-aligned mock data
4. `/src/app/utils/contact-helpers.ts` — Contact helper functions
5. `/CONTRACT_FIX_STATUS.md` — Migration status tracking
6. `/RUNBOOK_STATUS_FINAL.md` — This file

### Modified:
1. `/src/app/App.tsx` — Uses contract-aligned mock data
2. `/src/app/components/Badge.tsx` — Contract types
3. `/src/app/components/ContactDetailsSheet.tsx` — Contract types, uses .lon

---

## ✅ WHEN 100% COMPLETE, RUN:

```bash
# Final verification (all should return 0 matches)
echo "Checking legacy types..."
grep -R "'remote-id'\|'fpv'\|'unknown'" src/ --exclude-dir=node_modules | wc -l

echo "Checking .lng references..."
grep -R "\.lng\b" src/ --exclude-dir=node_modules | wc -l

echo "Checking legacy endpoints..."
grep -R "/status\|/ws" src/ --exclude-dir=node_modules | grep -v "/api/v1" | wc -l

echo "Checking freq_mhz..."
grep -R "freq_mhz" src/ --exclude-dir=node_modules | wc -l
```

**Expected:** All 4 commands return `0`

---

**Status:** 🔄 **36% COMPLETE** — Continue with remaining component updates

**Next Step:** Update `TouchContactCard.tsx` (highest priority, most frequently used)
