/**
 * Contact Sorting Utilities — CONTRACT ALIGNED
 * 
 * Implements operator-first sorting rules:
 * 1. Severity (Critical → Low)
 * 2. Nearest (only if GPS valid + distance exists)
 * 3. Last seen (most recent)
 */

import type { Contact } from '@/app/types/contacts';
import { isRemoteIdContact, isContactLost, isContactStale } from '@/app/types/contacts';
import { hasValidGPS } from './gps-helpers';

export type SortMode = 'severity' | 'nearest' | 'lastSeen';

/**
 * Severity values for sorting (higher = more critical)
 */
const SEVERITY_VALUES: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

/**
 * Get severity value for a contact
 */
function getSeverityValue(contact: Contact): number {
  return SEVERITY_VALUES[contact.severity] ?? 0;
}

/**
 * Sort contacts by severity (Critical → Low)
 */
function sortBySeverity(a: Contact, b: Contact): number {
  const severityDiff = getSeverityValue(b) - getSeverityValue(a);
  if (severityDiff !== 0) return severityDiff;
  
  // Tie-breaker: most recent first
  return b.last_seen_ms - a.last_seen_ms;
}

/**
 * Sort contacts by distance (nearest first)
 * Only valid when GPS fix is available
 */
function sortByNearest(a: Contact, b: Contact, gpsFixQuality: number): number {
  // GPS gating - if no valid GPS, fall back to severity
  if (!hasValidGPS(gpsFixQuality)) {
    return sortBySeverity(a, b);
  }
  
  // Get distances
  const distA = isRemoteIdContact(a) ? a.distance_m : undefined;
  const distB = isRemoteIdContact(b) ? b.distance_m : undefined;
  
  // Contacts with distance always come first
  if (distA !== undefined && distB === undefined) return -1;
  if (distA === undefined && distB !== undefined) return 1;
  if (distA === undefined && distB === undefined) return sortBySeverity(a, b);
  
  // Sort by distance (nearest first)
  const distDiff = distA! - distB!;
  if (distDiff !== 0) return distDiff;
  
  // Tie-breaker: severity
  return sortBySeverity(a, b);
}

/**
 * Sort contacts by last seen (most recent first)
 */
function sortByLastSeen(a: Contact, b: Contact): number {
  const timeDiff = b.last_seen_ms - a.last_seen_ms;
  if (timeDiff !== 0) return timeDiff;
  
  // Tie-breaker: severity
  return sortBySeverity(a, b);
}

/**
 * Sort contacts by the selected mode
 * 
 * @param contacts Contacts to sort
 * @param mode Sort mode
 * @param gpsFixQuality GPS fix quality (for nearest sorting)
 * @returns Sorted contacts
 */
export function sortContacts(
  contacts: Contact[],
  mode: SortMode,
  gpsFixQuality: number = 0
): Contact[] {
  const sorted = [...contacts];
  
  switch (mode) {
    case 'severity':
      return sorted.sort(sortBySeverity);
    
    case 'nearest':
      return sorted.sort((a, b) => sortByNearest(a, b, gpsFixQuality));
    
    case 'lastSeen':
      return sorted.sort(sortByLastSeen);
    
    default:
      return sorted.sort(sortBySeverity); // Default to severity
  }
}

/**
 * Get sort mode display label
 */
export function getSortModeLabel(mode: SortMode): string {
  switch (mode) {
    case 'severity':
      return 'Severity';
    case 'nearest':
      return 'Nearest';
    case 'lastSeen':
      return 'Last Seen';
    default:
      return 'Severity';
  }
}
