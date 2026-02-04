/**
 * GPS Helper Functions — CONTRACT ALIGNED
 * 
 * SOURCE OF TRUTH: docs/spces.md
 * 
 * GPS gating rule: fix_quality >= 2 (DGPS or better)
 */

/**
 * Check if GPS quality is sufficient for distance/bearing calculations
 * 
 * RULE: fix_quality >= 2 (DGPS)
 * - 0: No fix
 * - 1: GPS fix
 * - 2: DGPS (Differential GPS) ✅ VALID
 * - 3+: Better quality ✅ VALID
 * 
 * @param fix_quality GPS fix quality from status
 * @returns true if GPS is valid for distance/bearing
 */
export function hasValidGPS(fix_quality: number): boolean {
  return fix_quality >= 2;
}

/**
 * Get GPS status display text
 */
export function getGPSStatusText(fix_quality: number): string {
  if (fix_quality >= 2) return 'GPS Ready';
  if (fix_quality === 1) return 'GPS Fix (Low Accuracy)';
  return 'No GPS Fix';
}

/**
 * Check if GPS is available for "Center on me" feature
 * Same as hasValidGPS but more semantic name
 */
export function canCenterOnGPS(fix_quality: number): boolean {
  return hasValidGPS(fix_quality);
}
