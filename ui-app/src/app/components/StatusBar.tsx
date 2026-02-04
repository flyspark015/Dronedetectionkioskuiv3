import { Chip } from './Chip';
import { StatusTruthChips } from './StatusTruthChips';
import { AlertTriangle, ChevronDown } from 'lucide-react';

interface StatusBarProps {
  hasCriticalAlert: boolean;
  esp32Status: 'linked' | 'offline' | 'stale';
  remoteIdStatus?: 'connected' | 'degraded' | 'off';
  fpvScanState: 'scanning' | 'locked' | 'hold' | 'stopped';
  gpsFixQuality?: number;
  gpsHdop?: number;
  isReplayActive?: boolean;
  onOpenDrawer: () => void;
  showDevButton?: boolean;
  onToggleDev?: () => void;
  isDevOpen?: boolean;
  // Data age (seconds)
  telemetryAgeSeconds?: number;
  remoteIdAgeSeconds?: number;
  gpsAgeSeconds?: number;
}

export function StatusBar({
  hasCriticalAlert,
  esp32Status,
  remoteIdStatus = 'off',
  fpvScanState,
  gpsFixQuality = 0,
  gpsHdop,
  isReplayActive = false,
  onOpenDrawer,
  showDevButton = false,
  onToggleDev,
  isDevOpen = false,
  telemetryAgeSeconds,
  remoteIdAgeSeconds,
  gpsAgeSeconds
}: StatusBarProps) {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          {/* Primary chips */}
          <div className="flex items-center gap-2 overflow-x-auto flex-1 chips-scroll">
            {/* Critical indicator */}
            {hasCriticalAlert && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-full font-bold uppercase tracking-wide min-h-[40px] animate-pulse flex-shrink-0" style={{ fontSize: 'var(--font-micro)' }}>
                <AlertTriangle size={14} />
                <span>Critical</span>
              </div>
            )}
            
            {/* FPV Scan State (keep existing) */}
            <Chip 
              label={`Scan: ${fpvScanState.charAt(0).toUpperCase() + fpvScanState.slice(1)}`}
              variant={fpvScanState === 'scanning' ? 'info' : fpvScanState === 'locked' ? 'warning' : 'default'}
              size="sm"
            />
            
            {/* TRUTH CHIPS - Controller / Remote ID / GPS / Replay */}
            <StatusTruthChips
              esp32Status={esp32Status}
              remoteIdStatus={remoteIdStatus}
              gpsFixQuality={gpsFixQuality}
              gpsHdop={gpsHdop}
              isReplayActive={isReplayActive}
              telemetryAgeSeconds={telemetryAgeSeconds}
              remoteIdAgeSeconds={remoteIdAgeSeconds}
              gpsAgeSeconds={gpsAgeSeconds}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {showDevButton && (
              <button
                onClick={onToggleDev}
                aria-pressed={isDevOpen}
                className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-full min-h-[36px] border border-slate-700 transition-colors"
                style={{ fontSize: 'var(--font-micro)' }}
              >
                <span className="text-slate-200 font-semibold">DEV</span>
              </button>
            )}

            {/* Status drawer button - Touch-safe */}
            <button
              onClick={onOpenDrawer}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-full min-h-[44px] flex-shrink-0 border border-slate-700 transition-colors"
              style={{ fontSize: 'var(--font-caption)' }}
            >
              <span className="text-slate-300 font-medium">Status</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
