# N-Defender UI Contract Fix Status

**Started:** 2026-01-26  
**Status:** 🔄 IN PROGRESS (Steps 1-3 complete, Step 4 partial)

---

## ✅ COMPLETED STEPS

### Step 1: Kill legacy endpoints ✅ DONE
- **Created:** `/src/app/config/api.ts`
- **Endpoints:** `/api/v1/status`, `/api/v1/ws`
- **Verification:** No legacy endpoint usage in code

### Step 2: WebSocket envelope parsing ✅ DONE
- **Created:** `/src/app/services/websocket.ts`
- **Envelope:** `{ type, timestamp, source, data }`
- **Validation:** Rejects invalid messages
- **Verification:** All messages parsed correctly

### Step 3: Contract WS event names ✅ DONE
- **Events:** `TELEMETRY_UPDATE`, `CONTACT_*`, `REPLAY_STATE`
- **No:** `RID_CONTACT_*` references
- **Verification:** Unknown events logged safely

### Step 4: Field name fixes 🔄 PARTIAL (2/15 files)
**Completed:**
- ✅ `/src/app/components/ContactDetailsSheet.tsx` - Uses `lon` not `lng`, contract types
- ✅ `/src/app/components/Badge.tsx` - Contract types: `REMOTE_ID`, `FPV_LINK`, `UNKNOWN_RF`
- ✅ `/src/app/utils/contact-helpers.ts` - Helper functions created

**Remaining Files (13):**
1. ⏳ `/src/app/App.tsx` - Mock data uses legacy types
2. ⏳ `/src/app/components/ui/TouchContactCard.tsx` - Uses legacy types  
3. ⏳ `/src/app/components/ContactCard.tsx` - Uses legacy types
4. ⏳ `/src/app/components/HomeScreen.tsx` - Uses legacy type checks
5. ⏳ `/src/app/components/SelectedContactOverlay.tsx` - Uses legacy type check
6. ⏳ `/src/app/components/ContactsDrawerContent.tsx` - Uses legacy filter types
7. ⏳ `/src/app/components/TouchDemo.tsx` - Uses legacy mock data

---

## 🔄 STEP 4 MIGRATION PLAN

### Phase A: Update Component Type References (Priority 1)
Files that check `contact.type`:
- [ ] `HomeScreen.tsx` - Change `'remote-id'` → `'REMOTE_ID'`
- [ ] `ContactCard.tsx` - Change legacy types to contract types
- [ ] `TouchContactCard.tsx` - Change legacy types to contract types
- [ ] `SelectedContactOverlay.tsx` - Change type check
- [ ] `ContactsDrawerContent.tsx` - Change filter types

### Phase B: Update Mock Data (Priority 2)
Files with mock contact data:
- [ ] `App.tsx` - Update mock contacts to contract-aligned structure
- [ ] `TouchDemo.tsx` - Update mock contacts

### Phase C: Add Source Badges (Step 9)
All contact displays need source badges:
- [ ] `TouchContactCard.tsx` - Add source badge (`live`/`replay`)
- [ ] `ContactCard.tsx` - Add source badge
- [ ] `ContactDetailsSheet.tsx` - Add source badge (already updated)

### Phase D: GPS Gating (Step 5)
Components that show distance/bearing:
- [ ] `TouchContactCard.tsx` - GPS-gate distance/bearing display
- [ ] `ContactCard.tsx` - GPS-gate distance/bearing display
- [ ] `HomeScreen.tsx` - GPS-gate "Center Me" button
- [ ] `MapToolStack.tsx` - GPS-gate map controls

### Phase E: Frequency Units (Step 6)
Components showing frequency:
- [ ] `TouchContactCard.tsx` - Use `freq_hz`, convert to MHz for display
- [ ] `ContactCard.tsx` - Use `freq_hz`, convert to MHz for display
- [ ] `ContactDetailsSheet.tsx` - Already fixed ✅

---

## 🚨 CRITICAL ISSUES FOUND

### Issue 1: Mock Data Structure Mismatch
**File:** `/src/app/App.tsx`  
**Problem:** Mock data uses old structure (Date objects, legacy types)  
**Fix Required:** Convert to contract-aligned structure with:
- `last_seen_ts: number` (milliseconds)
- `type: 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF'`
- `remote_id.drone_coords.lon` (not `.lng`)
- `fpv_link.freq_hz` (not `.frequency` in MHz)

### Issue 2: Type Guards Not Used
**Files:** Multiple component files  
**Problem:** Direct type checks instead of type guards  
**Fix Required:** Use `isRemoteIdContact(contact)` instead of `contact.type === 'remote-id'`

### Issue 3: Field Access Inconsistency
**Files:** Multiple component files  
**Problem:** Direct field access (`.model`, `.distance`) instead of structured access  
**Fix Required:** Use `contact.remote_id.model`, `contact.distance_m`

---

## 📊 MIGRATION STATISTICS

| Category | Total | Complete | Remaining | % Done |
|----------|-------|----------|-----------|--------|
| Endpoint fixes | 1 | 1 | 0 | 100% |
| WebSocket service | 1 | 1 | 0 | 100% |
| Event name fixes | 1 | 1 | 0 | 100% |
| Component updates | 15 | 2 | 13 | 13% |
| **TOTAL** | **18** | **5** | **13** | **28%** |

---

## 🎯 NEXT ACTIONS (Recommended Approach)

### Option A: Complete Step 4 Systematically (Recommended)
Continue fixing files one by one until all legacy types removed:
1. Fix `App.tsx` mock data
2. Fix `TouchContactCard.tsx`
3. Fix `ContactCard.tsx`
4. ... (continue through list)

**Pros:** Thorough, complete
**Cons:** Time-intensive

### Option B: Fast-Track Critical Path
Focus on minimum viable changes:
1. Fix only files that block integration (App.tsx, HomeScreen.tsx)
2. Add GPS gating to critical components
3. Add source badges to main contact displays
4. Document remaining work for Phase 2

**Pros:** Faster to "working state"
**Cons:** Technical debt remains

---

## 📝 RECOMMENDATION

**I recommend Option A** - Complete Step 4 fully before proceeding to Steps 5-11.

**Rationale:**
- Legacy type references will cause TypeScript errors when integrated with backend
- GPS gating (Step 5) requires correct types to work properly
- Source badges (Step 9) require correct `source` field access
- Better to fix once correctly than patch multiple times

**Estimated Time:**
- Remaining 13 files × 10 min avg = ~2 hours
- Plus testing and verification = ~3 hours total

---

## ✅ WHEN COMPLETE, VERIFY:

```bash
# No legacy types
grep -R "'remote-id'\|'fpv'\|'unknown'" src/ --exclude-dir=node_modules

# No .lng references
grep -R "\.lng\b" src/ --exclude-dir=node_modules

# No legacy endpoints
grep -R "fetch.*['\"/]status['\"]" src/ --exclude-dir=node_modules
```

**Expected Result:** 0 matches for all three

---

**Status:** 🔄 AWAITING DIRECTION - Continue with Option A or B?
