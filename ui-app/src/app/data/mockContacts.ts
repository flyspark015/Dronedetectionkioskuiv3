/**
 * Mock Contact Data — CONTRACT ALIGNED
 * 
 * SOURCE OF TRUTH: src/app/types/contacts.ts
 * 
 * This mock data demonstrates the correct contract structure
 */

import type { Contact } from '@/app/types/contacts';

/**
 * Contract-aligned mock contacts
 * CRITICAL: Uses correct field names and types
 */
export const mockContacts: Contact[] = [
  // Remote ID Contact #1 (Critical, Pinned)
  {
    id: 'rid-1',
    type: 'REMOTE_ID',
    last_seen_ts: Date.now() - 30000,      // 30 seconds ago
    first_seen_ts: Date.now() - 300000,    // 5 minutes ago
    stale_after_ms: 15000,                 // 15 seconds
    source: 'live',
    severity: 'critical',
    isPinned: true,
    tags: ['priority', 'commercial'],
    remote_id: {
      model: 'DJI Mavic 3',
      serial_id: 'DJI-M3-78A4B2',
      operator_id: 'OP-12345',
      drone_coords: {
        lat: 37.7749,
        lon: -122.4194,       // ✅ lon (NOT lng)
        alt_m: 120
      },
      pilot_coords: {
        lat: 37.7750,
        lon: -122.4195        // ✅ lon (NOT lng)
      },
      home_coords: {
        lat: 37.7751,
        lon: -122.4196        // ✅ lon (NOT lng)
      }
    },
    distance_m: 245,            // ✅ Computed field
    bearing_deg: 142            // ✅ Computed field
  },
  
  // FPV Link Contact #1 (High, Locked)
  {
    id: 'fpv-1',
    type: 'FPV_LINK',
    last_seen_ts: Date.now() - 15000,      // 15 seconds ago
    first_seen_ts: Date.now() - 120000,    // 2 minutes ago
    stale_after_ms: 15000,
    source: 'live',
    severity: 'high',
    fpv_link: {
      freq_hz: 5860000000,      // ✅ 5860 MHz in Hz
      rssi_dbm: -68,
      lock_state: 'locked',
      band: '5.8GHz',
      threshold: 'Balanced',
      hit_count: 142
    }
  },
  
  // Remote ID Contact #2 (Medium, Stale)
  {
    id: 'rid-2',
    type: 'REMOTE_ID',
    last_seen_ts: Date.now() - 120000,     // 2 minutes ago (STALE)
    first_seen_ts: Date.now() - 600000,    // 10 minutes ago
    stale_after_ms: 15000,
    source: 'live',
    severity: 'medium',
    remote_id: {
      model: 'Autel EVO II',
      serial_id: 'AUTEL-EVO-9BC3',
      drone_coords: {
        lat: 37.7755,
        lon: -122.4200,       // ✅ lon (NOT lng)
        alt_m: 85
      }
    },
    distance_m: 487,
    bearing_deg: 78
  },
  
  // FPV Link Contact #2 (Medium, Scanning)
  {
    id: 'fpv-2',
    type: 'FPV_LINK',
    last_seen_ts: Date.now() - 45000,      // 45 seconds ago (STALE)
    first_seen_ts: Date.now() - 180000,    // 3 minutes ago
    stale_after_ms: 15000,
    source: 'live',
    severity: 'medium',
    tags: ['tracked'],
    fpv_link: {
      freq_hz: 5740000000,      // ✅ 5740 MHz in Hz
      rssi_dbm: -82,
      lock_state: 'scanning',
      band: '5.8GHz',
      hit_count: 67
    }
  },
  
  // Unknown RF Contact #1 (Low, Very Stale - would be LOST)
  {
    id: 'unknown-1',
    type: 'UNKNOWN_RF',
    last_seen_ts: Date.now() - 300000,     // 5 minutes ago (LOST)
    first_seen_ts: Date.now() - 900000,    // 15 minutes ago
    stale_after_ms: 15000,
    source: 'live',
    severity: 'low',
    unknown_rf: {
      signal_strength: 45,
      notes: 'Intermittent signal detected'
    }
  },
  
  // FPV Link Contact #3 (High, Hold, Pinned)
  {
    id: 'fpv-3',
    type: 'FPV_LINK',
    last_seen_ts: Date.now() - 8000,       // 8 seconds ago (ACTIVE)
    first_seen_ts: Date.now() - 240000,    // 4 minutes ago
    stale_after_ms: 15000,
    source: 'live',
    severity: 'high',
    isPinned: true,
    fpv_link: {
      freq_hz: 5945000000,      // ✅ 5945 MHz in Hz
      rssi_dbm: -55,
      lock_state: 'hold',
      band: '5.8GHz',
      threshold: 'Critical Focus',
      hit_count: 203
    }
  },
  
  // REPLAY Example - Remote ID from replay
  {
    id: 'rid-replay-1',
    type: 'REMOTE_ID',
    last_seen_ts: Date.now() - 60000,      // 1 minute ago
    first_seen_ts: Date.now() - 180000,    // 3 minutes ago
    stale_after_ms: 15000,
    source: 'replay',           // ✅ REPLAY source
    severity: 'high',
    remote_id: {
      model: 'Parrot Anafi',
      serial_id: 'PARROT-ANAFI-4D2E',
      drone_coords: {
        lat: 37.7760,
        lon: -122.4180,       // ✅ lon (NOT lng)
        alt_m: 95
      }
    },
    distance_m: 312,
    bearing_deg: 215
  }
];
