export interface SweepPlan {
  id: string;
  name: string;
  enabled: boolean;
  start_hz: number;
  stop_hz: number;
  step_hz: number;
  sample_rate_hz: number;
  rf_bandwidth_hz: number;
  priority: number;
  dwell_ms?: number;
}

export interface DetectionConfig {
  min_snr_db: number;
  max_peaks: number;
  min_spacing_hz: number;
  edge_guard_hz: number;
}

export interface TrackingConfig {
  min_track_snr_db: number;
  min_hits_to_confirm: number;
  ttl_s: number;
  bin_hz: number;
  merge_hz: number;
  lo_guard_hz: number;
  window_s: number;
}

export interface ClassificationConfig {
  mode: 'conservative' | 'aggressive';
  bandwidth_thresholds?: {
    narrow_max_hz: number;
    wide_min_hz: number;
  };
}

export interface OutputConfig {
  mode: 'stdout' | 'file';
  file_path?: string;
  log_level: 'quiet' | 'normal' | 'debug';
  show_raw_peaks: boolean;
  show_rf_contacts_only: boolean;
}

export interface RfScanConfig {
  scan_profile: 'fast' | 'balanced' | 'high-coverage' | 'custom';
  sweep_plans: SweepPlan[];
  detection: DetectionConfig;
  tracking: TrackingConfig;
  classification: ClassificationConfig;
  output: OutputConfig;
  last_applied_at?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'blocked';
  fixAction?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
  fixAction?: string;
}

export interface HealthStatus {
  connection_status: 'connected' | 'reconnecting' | 'error';
  current_plan_name: string;
  current_center_hz: number;
  sweep_rate_steps_per_sec: number;
  estimated_cycle_time_s: number;
  contacts_count: number;
  peaks_per_sec: number;
  last_error?: string;
  telemetry_age_s: number;
}
