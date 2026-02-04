import { X, HardDrive, Wifi, Clock, Cpu, Battery, Globe } from 'lucide-react';
import { Chip } from './Chip';

interface StatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storagePercentFree?: number | null;
  telemetryAgeSeconds?: number | null;
  cpuTemp?: number | null;
  batteryLevel?: number | null;
  networkLabel?: string | null;
  remoteIdActive?: boolean;
}

export function StatusDrawer({
  isOpen,
  onClose,
  storagePercentFree,
  telemetryAgeSeconds,
  cpuTemp,
  batteryLevel,
  networkLabel,
  remoteIdActive = false
}: StatusDrawerProps) {
  if (!isOpen) return null;

  const storageValue = Number.isFinite(storagePercentFree)
    ? `${Math.round(storagePercentFree)}%`
    : '—';
  const storageLabel = Number.isFinite(storagePercentFree) ? 'Free' : 'N/A';

  const telemetryValue = Number.isFinite(telemetryAgeSeconds)
    ? `${Math.max(0, Number(telemetryAgeSeconds)).toFixed(1)}s`
    : '—';
  const telemetryLabel = Number.isFinite(telemetryAgeSeconds) ? 'Age' : 'N/A';

  const cpuValue = Number.isFinite(cpuTemp) ? `${Number(cpuTemp).toFixed(1)}°C` : '—';
  const cpuLabel = Number.isFinite(cpuTemp)
    ? (Number(cpuTemp) < 60 ? 'Normal' : Number(cpuTemp) < 75 ? 'Warm' : 'Hot')
    : 'N/A';

  const batteryValue = Number.isFinite(batteryLevel) ? `${Math.round(Number(batteryLevel))}%` : '—';
  const batteryLabel = Number.isFinite(batteryLevel)
    ? (Number(batteryLevel) > 50 ? 'Good' : Number(batteryLevel) > 20 ? 'Low' : 'Critical')
    : 'N/A';

  const networkValue = (networkLabel && String(networkLabel).trim().length > 0) ? String(networkLabel) : '—';
  const networkSubLabel = networkValue === '—' ? 'N/A' : 'Connected';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      
      {/* Drawer - slides down from status bar */}
      <div className="fixed top-[52px] left-0 right-0 z-50 bg-slate-900 border-b border-slate-700 shadow-xl animate-slide-down">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-slate-100">System Status</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <X size={20} className="text-slate-300" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Storage */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={16} className="text-slate-400" />
                <span className="text-[12px] text-slate-400">Storage</span>
              </div>
              <div className="text-[18px] font-bold text-slate-100">{storageValue}</div>
              <div className="text-[11px] text-slate-500">{storageLabel}</div>
            </div>

            {/* Remote ID Sensor */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={16} className="text-slate-400" />
                <span className="text-[12px] text-slate-400">RID Sensor</span>
              </div>
              <Chip 
                label={remoteIdActive ? 'Online' : 'Offline'}
                variant={remoteIdActive ? 'success' : 'danger'}
                size="sm"
              />
            </div>

            {/* Telemetry Age */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-slate-400" />
                <span className="text-[12px] text-slate-400">Telemetry</span>
              </div>
              <div className="text-[18px] font-bold text-slate-100">{telemetryValue}</div>
              <div className="text-[11px] text-slate-500">{telemetryLabel}</div>
            </div>

            {/* CPU Temperature */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={16} className="text-slate-400" />
                <span className="text-[12px] text-slate-400">CPU Temp</span>
              </div>
              <div className="text-[18px] font-bold text-slate-100">{cpuValue}</div>
              <div className="text-[11px] text-slate-500">{cpuLabel}</div>
            </div>

            {/* Battery */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Battery size={16} className="text-slate-400" />
                <span className="text-[12px] text-slate-400">Battery</span>
              </div>
              <div className="text-[18px] font-bold text-slate-100">{batteryValue}</div>
              <div className="text-[11px] text-slate-500">{batteryLabel}</div>
            </div>

            {/* Network */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={16} className="text-slate-400" />
                <span className="text-[12px] text-slate-400">Network</span>
              </div>
              <div className="text-[14px] font-semibold text-slate-100">{networkValue}</div>
              <div className="text-[11px] text-slate-500">{networkSubLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
