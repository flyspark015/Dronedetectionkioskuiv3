/**
 * Status Truth Chips — OPERATOR CLARITY
 * 
 * 4 critical status indicators that must never lie:
 * - Controller: Link status + telemetry age
 * - RemoteID: Receiver status + data age
 * - GPS: Fix quality + data age
 * - Replay: Live vs Replay mode
 * 
 * These prevent "UI looks alive but sensors dead"
 */

import { Wifi, Radio, Navigation, PlayCircle, WifiOff, AlertCircle } from 'lucide-react';

export interface StatusTruthChipsProps {
  esp32Status: 'linked' | 'offline' | 'stale';
  remoteIdStatus: 'connected' | 'degraded' | 'off';
  gpsFixQuality: number; // 0=no fix, 1=GPS, 2+=DGPS
  gpsHdop?: number;
  isReplayActive: boolean;
  // Data age (seconds)
  telemetryAgeSeconds?: number;
  remoteIdAgeSeconds?: number;
  gpsAgeSeconds?: number;
}

export function StatusTruthChips({
  esp32Status,
  remoteIdStatus,
  gpsFixQuality,
  gpsHdop,
  isReplayActive,
  telemetryAgeSeconds,
  remoteIdAgeSeconds,
  gpsAgeSeconds
}: StatusTruthChipsProps) {
  
  // Controller chip - override variant if data is stale
  let esp32Variant: 'success' | 'warning' | 'danger' = 
    esp32Status === 'linked' ? 'success' : 
    esp32Status === 'stale' ? 'warning' : 'danger';
  
  if (telemetryAgeSeconds !== undefined && telemetryAgeSeconds > 10) {
    esp32Variant = 'danger';
  } else if (telemetryAgeSeconds !== undefined && telemetryAgeSeconds > 5) {
    esp32Variant = 'warning';
  }
  
  const esp32Icon = esp32Status === 'offline' ? WifiOff : Wifi;
  const esp32Age = telemetryAgeSeconds !== undefined ? `${telemetryAgeSeconds}s` : undefined;
  
  // RemoteID chip - override variant if data is stale
  let remoteIdVariant: 'success' | 'warning' | 'danger' = 
    remoteIdStatus === 'connected' ? 'success' :
    remoteIdStatus === 'degraded' ? 'warning' : 'danger';
    
  if (remoteIdAgeSeconds !== undefined && remoteIdAgeSeconds > 10) {
    remoteIdVariant = 'danger';
  } else if (remoteIdAgeSeconds !== undefined && remoteIdAgeSeconds > 5) {
    remoteIdVariant = 'warning';
  }
  
  const remoteIdAge = remoteIdAgeSeconds !== undefined ? `${remoteIdAgeSeconds}s` : undefined;
  
  // GPS chip - override variant if data is stale
  let gpsVariant: 'success' | 'warning' | 'danger' = 
    gpsFixQuality >= 2 ? 'success' : 
    gpsFixQuality === 1 ? 'warning' : 'danger';
    
  if (gpsAgeSeconds !== undefined && gpsAgeSeconds > 10) {
    gpsVariant = 'danger';
  } else if (gpsAgeSeconds !== undefined && gpsAgeSeconds > 5 && gpsFixQuality >= 1) {
    gpsVariant = 'warning';
  }
  
  const gpsText = gpsFixQuality >= 2 ? 'GPS Fix' : gpsFixQuality === 1 ? 'GPS (Low)' : 'No GPS';
  const gpsAge = gpsAgeSeconds !== undefined && gpsFixQuality >= 1 ? `${gpsAgeSeconds}s` : undefined;
  const hasHdop = gpsHdop != null && Number.isFinite(gpsHdop);
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Controller Status */}
      <StatusChip
        icon={esp32Icon}
        label="Controller"
        value={esp32Status === 'linked' ? 'Link' : esp32Status === 'stale' ? 'Stale' : 'Off'}
        age={esp32Age}
        variant={esp32Variant}
      />
      
      {/* RemoteID Status */}
      <StatusChip
        icon={Radio}
        label="RID"
        value={remoteIdStatus === 'connected' ? 'On' : remoteIdStatus === 'degraded' ? 'Degraded' : 'Off'}
        age={remoteIdAge}
        variant={remoteIdVariant}
      />
      
      {/* GPS Status */}
      <StatusChip
        icon={Navigation}
        label={gpsText}
        value={hasHdop && gpsFixQuality >= 1 ? `HDOP ${gpsHdop.toFixed(1)}` : undefined}
        age={gpsAge}
        variant={gpsVariant}
      />
      
      {/* Replay Indicator (only show when active) */}
      {isReplayActive && (
        <StatusChip
          icon={PlayCircle}
          label="REPLAY"
          variant="warning"
          highlight
        />
      )}
    </div>
  );
}

// Internal status chip component
interface StatusChipProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  age?: string; // Data age badge
  variant: 'success' | 'warning' | 'danger';
  highlight?: boolean;
}

function StatusChip({ icon: Icon, label, value, age, variant, highlight }: StatusChipProps) {
  const variantClasses = {
    success: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50',
    warning: 'bg-amber-950/50 text-amber-400 border-amber-800/50',
    danger: 'bg-red-950/50 text-red-400 border-red-800/50',
  };
  
  const highlightClass = highlight ? 'ring-2 ring-amber-500/50 animate-pulse' : '';
  
  return (
    <div className={`
      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold relative
      ${variantClasses[variant]} ${highlightClass} flex-shrink-0
    `}>
      <Icon size={12} />
      <span className="uppercase tracking-wide">{label}</span>
      {value && (
        <>
          <span className="text-slate-500">•</span>
          <span className="font-normal opacity-90">{value}</span>
        </>
      )}
      {age && (
        <>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-[10px] opacity-75">{age}</span>
        </>
      )}
    </div>
  );
}
