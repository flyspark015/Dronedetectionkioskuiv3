/**
 * Contact Helper Functions — CONTRACT ALIGNED
 * 
 * SOURCE OF TRUTH: docs/contracts.ts + src/app/types/contacts.ts
 * 
 * These helpers ensure consistent contact handling across the UI
 */

import type { Contact } from '@/app/types/contacts';
import { 
  isRemoteIdContact, 
  isFpvLinkContact, 
  isUnknownRfContact,
  getDisplayFrequencyMHz,
  isContactStale,
  isContactLost,
  getTimeSinceLastSeen
} from '@/app/types/contacts';
import { hasValidGPS } from './gps-helpers';

/**
 * Get contact display name
 */
export function getContactDisplayName(contact: Contact): string {
  if (isRemoteIdContact(contact)) {
    return contact.remote_id?.model || contact.remote_id?.serial_id || contact.id;
  }
  
  if (isFpvLinkContact(contact)) {
    const mhz = getDisplayFrequencyMHz(contact.fpv_link.freq_hz);
    return (mhz != null && Number.isFinite(mhz)) ? `${mhz.toFixed(0)} MHz` : '-';
  }
  
  return 'Unknown Signal';
}

/**
 * Get contact type label
 */
export function getContactTypeLabel(contact: Contact): string {
  switch (contact.type) {
    case 'REMOTE_ID':
      return 'Remote ID';
    case 'FPV_LINK':
      return 'FPV Video';
    case 'UNKNOWN_RF':
      return 'Unknown';
  }
}

/**
 * Get contact subtitle (secondary info)
 */
export function getContactSubtitle(contact: Contact): string | undefined {
  if (isRemoteIdContact(contact)) {
    return contact.remote_id?.serial_id;
  }
  
  if (isFpvLinkContact(contact)) {
    return contact.fpv_link.band;
  }
  
  return undefined;
}

/**
 * Check if contact distance/bearing should be displayed
 * Requires valid GPS AND contact has coordinates
 */
export function canShowDistance(contact: Contact, gps_fix_quality: number): boolean {
  return hasValidGPS(gps_fix_quality) && 
         isRemoteIdContact(contact) && 
         contact.distance_m !== undefined;
}

/**
 * Check if contact has coordinates (can be plotted on map)
 */
export function hasCoordinates(contact: Contact): boolean {
  return isRemoteIdContact(contact) && 
         contact.remote_id?.drone_coords !== undefined &&
         contact.remote_id?.drone_coords?.lat !== undefined &&
         contact.remote_id?.drone_coords?.lon !== undefined;
}

/**
 * Get contact state (ACTIVE/STALE/LOST)
 */
export function getContactState(contact: Contact): 'active' | 'stale' | 'lost' {
  if (isContactLost(contact)) return 'lost';
  if (isContactStale(contact)) return 'stale';
  return 'active';
}

// Re-export type guards and helpers for convenience
export {
  isRemoteIdContact,
  isFpvLinkContact,
  isUnknownRfContact,
  getDisplayFrequencyMHz,
  isContactStale,
  isContactLost,
  getTimeSinceLastSeen
};
