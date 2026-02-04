/**
 * Data Age Utilities
 * 
 * Prevents "UI looks alive but sensors dead" by showing data freshness
 */

export interface DataAgeResult {
  ageSeconds: number;
  ageLabel: string;
  isStale: boolean;  // >5s
  isCritical: boolean; // >10s
}

/**
 * Calculate data age from last update timestamp
 * @param lastUpdateMs - Last update timestamp in milliseconds (Date.now() format)
 * @param nowMs - Current time in milliseconds (defaults to Date.now())
 */
export function calculateDataAge(lastUpdateMs: number, nowMs: number = Date.now()): DataAgeResult {
  const ageMs = nowMs - lastUpdateMs;
  const ageSeconds = Math.floor(ageMs / 1000);
  
  // Format age label
  let ageLabel: string;
  if (ageSeconds < 60) {
    ageLabel = `${ageSeconds}s`;
  } else if (ageSeconds < 3600) {
    const minutes = Math.floor(ageSeconds / 60);
    ageLabel = `${minutes}m`;
  } else {
    const hours = Math.floor(ageSeconds / 3600);
    ageLabel = `${hours}h`;
  }
  
  return {
    ageSeconds,
    ageLabel,
    isStale: ageSeconds > 5,
    isCritical: ageSeconds > 10
  };
}

/**
 * Get variant for age-based chip coloring
 */
export function getAgeVariant(ageSeconds: number): 'success' | 'warning' | 'danger' {
  if (ageSeconds > 10) return 'danger';
  if (ageSeconds > 5) return 'warning';
  return 'success';
}
