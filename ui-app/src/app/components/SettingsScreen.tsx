import { useEffect, useRef, useState } from 'react';
import { Card } from './Card';
import { Chip } from './Chip';
import { Button } from './Button';
import { HoldButton } from './HoldButton';
import { RfScanSettings } from './antsdr/RfScanSettings';
import { NetworkSettings } from './NetworkSettings';
import { Activity, Wifi, Bell, Video, Code, Volume2, Power, RotateCcw, Map, Radio, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  updateAlertsSettings,
  updateMapsSettings,
  rebootUi,
  rebootDevice,
  buzzerTest,
  videoCaptureToggle,
  getSystemVolume,
  getPmtilesPacks,
} from '@/app/services/settings';
import { playSound, sendVolumeCommand } from '@/app/services/audioCommands';

interface SettingsScreenProps {
  hasCriticalAlert?: boolean;
  statusSnapshot?: any | null;
  devEnabled?: boolean;
  onOpenDevPanel?: () => void;
}

function formatUptime(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds)) return '-';
  let remaining = Math.max(0, Math.floor(seconds));
  const days = Math.floor(remaining / 86400);
  remaining -= days * 86400;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

function formatNumber(value: any, digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return Number(value).toFixed(digits);
}

function formatStorage(free?: number, total?: number) {
  const freeNum = Number(free);
  const totalNum = Number(total);
  if (Number.isFinite(freeNum) && Number.isFinite(totalNum)) {
    return `${freeNum.toFixed(1)} / ${totalNum.toFixed(1)} GB`;
  }
  if (Number.isFinite(freeNum)) {
    return `${freeNum.toFixed(1)} GB`;
  }
  return '-';
}

function formatBytes(bytes?: number | null) {
  const value = Number(bytes);
  if (!Number.isFinite(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}


function formatAgo(ms?: number | null) {
  if (ms == null || !Number.isFinite(Number(ms))) return '-';
  const val = Math.max(0, Number(ms));
  if (val < 1000) return `${Math.round(val)} ms ago`;
  const seconds = val / 1000;
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s ago`;
  }
  return `${seconds.toFixed(1)} s ago`;
}

function formatEta(seconds?: number | null) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '—';
  const total = Math.max(0, Math.round(Number(seconds)));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'unsupported';

function useSaveState() {
  const [state, setState] = useState<SaveState>('idle');
  const timerRef = useRef<number | null>(null);

  const setTimed = (next: SaveState) => {
    setState(next);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (next === 'saved' || next === 'error' || next === 'unsupported') {
      timerRef.current = window.setTimeout(() => setState('idle'), 1800);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return [state, setTimed] as const;
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const label = state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'unsupported' ? 'Not supported' : 'Failed';
  const color = state === 'saved'
    ? 'text-emerald-400'
    : state === 'saving'
      ? 'text-slate-400'
      : state === 'unsupported'
        ? 'text-amber-400'
        : 'text-red-400';
  return <span className={`text-[12px] font-semibold ${color}`}>{label}</span>;
}

export function SettingsScreen({
  hasCriticalAlert = false,
  statusSnapshot,
  devEnabled = false,
  onOpenDevPanel,
}: SettingsScreenProps) {
  const [audioVolume, setAudioVolume] = useState(80);
  const [speakerBusy, setSpeakerBusy] = useState(false);
  const [buzzerBusy, setBuzzerBusy] = useState(false);
  const [alertPreset, setAlertPreset] = useState<'Balanced' | 'Critical Focus' | 'Training'>('Balanced');
  const [showRfSettings, setShowRfSettings] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initRef = useRef(false);

  const [audioSaveState, setAudioSaveState] = useSaveState();
  const [alertsSaveState, setAlertsSaveState] = useSaveState();
  const [systemSaveState, setSystemSaveState] = useSaveState();
  const [videoSaveState, setVideoSaveState] = useSaveState();
  const [mapsSaveState, setMapsSaveState] = useSaveState();
  const [pmtilesReady, setPmtilesReady] = useState(false);
  const [pmtilesSizeBytes, setPmtilesSizeBytes] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<'online' | 'offline' | 'auto'>('auto');
  const [offlinePackId, setOfflinePackId] = useState<string>('asia');
  const [mbtilesReady, setMbtilesReady] = useState<boolean>(false);
  const [mbtilesBytes, setMbtilesBytes] = useState<number | null>(null);

  const audioPendingRef = useRef(false);
  const systemVolumeInitRef = useRef(false);
  const alertsPendingRef = useRef(false);
  const systemPendingRef = useRef(false);
  const mapsPendingRef = useRef(false);
  const audioQueuedRef = useRef<Partial<{ volume: number }> | null>(null);
  const pmtilesInitRef = useRef(false);

  const system = statusSnapshot?.system ?? {};
  const gps = statusSnapshot?.gps ?? {};
  const esp32 = statusSnapshot?.esp32 ?? {};
  const fpv = statusSnapshot?.fpv ?? {};
  const ridStatus = statusSnapshot?.remote_id ?? {};
  const ridHealth = ridStatus?.health ?? {};
  const rfSensor = statusSnapshot?.rf_sensor ?? {};
  const settings = statusSnapshot?.settings ?? {};
  const audioSettings = settings?.audio ?? {};
  const alertsSettings = settings?.alerts ?? {};
  const mapsSettings = settings?.maps ?? {};

  useEffect(() => {
    if (initRef.current) return;
    if (!statusSnapshot?.settings) return;
    if (audioSettings?.volume != null && !systemVolumeInitRef.current) setAudioVolume(Number(audioSettings.volume));
    if (alertsSettings?.preset) setAlertPreset(alertsSettings.preset as any);
    if (mapsSettings?.mode) setMapMode(mapsSettings.mode as any);
    const pack = String(mapsSettings?.offline_pack_id || '').trim();
    setOfflinePackId(pack && pack !== 'india' ? pack : 'asia');
    initRef.current = true;
  }, [statusSnapshot, audioSettings, alertsSettings, mapsSettings]);

  useEffect(() => {
    let cancelled = false;
    const loadVolume = async () => {
      const res = await getSystemVolume();
      if (!cancelled && res.ok && res.data?.percent != null) {
        systemVolumeInitRef.current = true;
        setAudioVolume(Number(res.data.percent));
      }
    };
    loadVolume();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPmtilesStatus = async () => {
      if (pmtilesInitRef.current) return;
      pmtilesInitRef.current = true;
      const res = await getPmtilesPacks();
      if (cancelled) return;
      if (res.ok) {
        const pack = Array.isArray(res.data?.packs) ? res.data.packs[0] : null;
        const installed = Boolean(pack?.installed);
        const bytes = Number(pack?.bytes ?? 0);
        setPmtilesReady(installed && bytes > 0);
        setPmtilesSizeBytes(installed ? bytes : null);
        return;
      }
      setPmtilesReady(false);
      setPmtilesSizeBytes(null);
    };
    loadPmtilesStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMbtilesStatus = async () => {
      try {
        const res = await fetch('/api/v1/maps/mbtiles/status', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setMbtilesReady(Boolean(data.exists));
          setMbtilesBytes(Number(data.bytes ?? 0));
        }
      } catch {
        // ignore
      }
    };
    loadMbtilesStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch('/api/v1/ui/debug/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ts: Date.now(), event: 'settings_mount' }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const handleRebootUI = async () => {
    if (systemPendingRef.current) return;
    systemPendingRef.current = true;
    setSystemSaveState('saving');
    const res = await rebootUi(false);
    setSystemSaveState(res.ok ? 'saved' : (res.error === 'not supported in this build' ? 'unsupported' : 'error'));
    systemPendingRef.current = false;
  };

  const handleRebootDevice = async () => {
    if (systemPendingRef.current) return;
    systemPendingRef.current = true;
    setSystemSaveState('saving');
    const res = await rebootDevice(false);
    setSystemSaveState(res.ok ? 'saved' : (res.error === 'not supported in this build' ? 'unsupported' : 'error'));
    systemPendingRef.current = false;
  };

  const handleBuzzerTest = async () => {
    if (buzzerBusy) return;
    setBuzzerBusy(true);
    setAudioSaveState('saving');
    playSound('test_buzzer');
    const res = await buzzerTest();
    setAudioSaveState(res.ok ? 'saved' : (res.error === 'not supported in this build' ? 'unsupported' : 'error'));
    setBuzzerBusy(false);
  };

  const handleSpeakerTest = async () => {
    if (speakerBusy) return;
    setSpeakerBusy(true);
    setAudioSaveState('saving');
    playSound('startup_bg');
    setAudioSaveState('saved');
    setSpeakerBusy(false);
  };

  const controllerConnected = String(esp32?.status ?? '').toLowerCase() === 'connected';
  const controllerLabel = controllerConnected ? 'Connected' : 'Disconnected';
  const controllerVariant = controllerConnected ? 'success' : 'danger';

  const fpvState = String(fpv?.scan_state ?? 'idle').toLowerCase();
  const fpvActive = fpvState !== 'idle';
  const fpvLabel = fpvActive ? (fpvState === 'locked' ? 'Locked' : 'Active') : 'Idle';
  const fpvVariant = fpvActive ? 'success' : 'default';

  const ridState = String(ridHealth?.state ?? '').toLowerCase();
  const ridActive = ridState === 'connected';
  const ridLabel = ridActive ? 'Active' : 'Inactive';
  const ridVariant = ridActive ? 'success' : 'danger';

  const overallOk = statusSnapshot?.overall_ok;
  const systemStatusLabel = overallOk === true ? 'OK' : overallOk === false ? 'DEGRADED' : 'UNKNOWN';
  const systemStatusClass = overallOk === true ? 'text-emerald-400' : overallOk === false ? 'text-amber-400' : 'text-slate-400';

  const gpsFixQuality = Number.isFinite(gps?.fix_quality) ? gps.fix_quality : (Number.isFinite(gps?.mode) ? gps.mode : 0);
  const gpsStatusLabel = gpsFixQuality >= 2 ? 'GPS Fix' : gpsFixQuality === 1 ? 'GPS (Low)' : 'No Fix';
  const gpsStatusClass = gpsFixQuality >= 2 ? 'text-emerald-400' : gpsFixQuality === 1 ? 'text-amber-400' : 'text-red-400';
  const gpsHdopValue = gps?.hdop != null ? `HDOP ${formatNumber(gps.hdop)}` : null;

  const rfState = String(rfSensor?.state ?? 'down').toLowerCase();
  const rfStatusLabel = rfState === 'ok' ? 'OK' : rfState === 'degraded' ? 'DEGRADED' : 'DOWN';
  const rfStatusClass = rfState === 'ok' ? 'text-emerald-400' : rfState === 'degraded' ? 'text-amber-400' : 'text-red-400';

  const ridNetState = String(ridStatus?.status ?? 'down').toLowerCase();
  const ridNetStatusLabel = ridNetState === 'ok' ? 'OK' : ridNetState === 'degraded' ? 'DEGRADED' : 'DOWN';
  const ridNetStatusClass = ridNetState === 'ok' ? 'text-emerald-400' : ridNetState === 'degraded' ? 'text-amber-400' : 'text-red-400';

  const versionValue = system?.version ?? 'v1.2.5';
  const uptimeValue = system?.uptime_seconds != null ? formatUptime(system.uptime_seconds) : '3d 14h 23m';
  const cpuTempValue = system?.cpu_temp_celsius != null ? `${formatNumber(system.cpu_temp_celsius)}°C` : '48°C';
  const batteryValue = system?.battery_level != null ? `${Math.round(system.battery_level)}%` : '87%';
  const storageValue = system?.storage_free_gb != null || system?.storage_total_gb != null
    ? `${formatStorage(system.storage_free_gb, system.storage_total_gb)} free`
    : '45.2 GB free';
  const networkValue = system?.network_status ?? 'WiFi: Connected';
  const gpsValue = gps?.satellites != null && gps?.hdop != null
    ? `${gps.satellites} satellites, HDOP ${formatNumber(gps.hdop)}`
    : '12 satellites, HDOP 1.2';

  const pmtilesStatusLabel = pmtilesReady ? 'Offline map ready' : 'Offline map missing';
  const pmtilesSizeLabel = pmtilesReady && pmtilesSizeBytes != null ? formatBytes(pmtilesSizeBytes) : '—';
  const mbtilesStatusLabel = mbtilesReady ? 'MBTiles ready' : 'MBTiles missing';
  const mbtilesSizeLabel = mbtilesReady && mbtilesBytes != null ? formatBytes(mbtilesBytes) : '—';

  const commitAudioSettings = async (payload: { volume?: number }) => {
    if (audioPendingRef.current) {
      audioQueuedRef.current = { ...(audioQueuedRef.current || {}), ...payload };
      return;
    }
    audioPendingRef.current = true;
    setAudioSaveState('saving');
    const targetVolume = payload.volume ?? audioVolume;
    const res = await sendVolumeCommand(targetVolume);
    setAudioSaveState(res.ok ? 'saved' : (res.err === 'ws_disconnected' ? 'unsupported' : 'error'));
    audioPendingRef.current = false;
    if (audioQueuedRef.current) {
      const next = audioQueuedRef.current;
      audioQueuedRef.current = null;
      commitAudioSettings(next);
    }
  };

  const commitAlertsSettings = async (payload: { preset: 'Balanced' | 'Critical Focus' | 'Training' }) => {
    if (alertsPendingRef.current) return;
    alertsPendingRef.current = true;
    setAlertsSaveState('saving');
    const res = await updateAlertsSettings(payload);
    setAlertsSaveState(res.ok ? 'saved' : (res.error === 'not supported in this build' ? 'unsupported' : 'error'));
    alertsPendingRef.current = false;
  };

  const commitMapsSettings = async (payload: { mode?: 'online' | 'offline' | 'auto'; offline_pack_id?: string | null }) => {
    if (mapsPendingRef.current) return;
    mapsPendingRef.current = true;
    setMapsSaveState('saving');
    const res = await updateMapsSettings(payload);
    setMapsSaveState(res.ok ? 'saved' : (res.error === 'not supported in this build' ? 'unsupported' : 'error'));
    mapsPendingRef.current = false;
  };

  const emitMapsChange = (mode: 'online' | 'offline' | 'auto', packId: string) => {
    try {
      window.dispatchEvent(new CustomEvent('maps-settings-changed', { detail: { mode, offline_pack_id: packId } }));
    } catch {}
  };

  useEffect(() => {
    if (!initRef.current) return;
    const t = window.setTimeout(() => {
      commitAudioSettings({ volume: audioVolume });
    }, 300);
    return () => window.clearTimeout(t);
  }, [audioVolume]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scrollValue = params.get('scroll');
    if (!scrollValue) return;
    const top = Number(scrollValue);
    if (!Number.isFinite(top)) return;
    const timer = window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top, behavior: 'auto' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  // If showing RF scanning settings, render that component
  if (showRfSettings) {
    return <RfScanSettings onBack={() => setShowRfSettings(false)} />;
  }

  const groupMenu = [
    { id: 'system', label: 'System', description: 'Device health, storage, power', icon: Activity },
    { id: 'audio', label: 'Audio', description: 'Volume, speaker, buzzer', icon: Volume2 },
    { id: 'sensors', label: 'Sensors', description: 'ESP32, RF, Remote ID', icon: Radio },
    { id: 'maps', label: 'Maps', description: 'Offline packs and status', icon: Map },
    { id: 'alerts', label: 'Alerts', description: 'Alert presets', icon: Bell },
    { id: 'video', label: 'Video', description: 'Capture settings', icon: Video },
    { id: 'network', label: 'Network', description: 'Wi-Fi and Bluetooth', icon: Wifi },
    { id: 'diagnostics', label: 'Diagnostics', description: 'Logs and advanced tools', icon: Code },
  ];

  if (!activeGroup) {
    return (
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scroll-panel px-4 pb-[calc(var(--tab-bar-height)+16px)] pt-[calc(76px+env(safe-area-inset-top))] space-y-4"
        style={{ touchAction: 'pan-y' }}
      >
        <section>
          <h2 className="text-[19px] font-semibold text-slate-100 mb-3">Settings</h2>
          <Card>
            <div className="divide-y divide-slate-800">
              {groupMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveGroup(item.id)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[72px]"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-slate-300" />
                      <div className="text-left">
                        <div className="text-[15px] font-semibold text-slate-100">{item.label}</div>
                        <div className="text-[12px] text-slate-400">{item.description}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-500" />
                  </button>
                );
              })}
            </div>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto scroll-panel px-4 pb-[calc(var(--tab-bar-height)+16px)] pt-[calc(76px+env(safe-area-inset-top))] space-y-4"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveGroup(null)}
          className="p-2 rounded-full hover:bg-slate-800 active:bg-slate-700 transition-colors"
        >
          <ChevronLeft size={18} className="text-slate-300" />
        </button>
        <div className="text-[18px] font-semibold text-slate-100">
          {groupMenu.find((g) => g.id === activeGroup)?.label || 'Settings'}
        </div>
      </div>
      {/* Audio Section */}
      {activeGroup === 'audio' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Volume2 size={20} />
          <span className="flex-1">Audio</span>
          <SaveStatus state={audioSaveState} />
        </h2>
        <Card>
          <div className="space-y-4">
            {/* Volume Slider */}
            <div>
              <div className="flex justify-between items-center mb-3 min-h-[56px]">
                <span className="text-[15px] text-slate-300 font-medium">Volume</span>
                <span className="text-[14px] text-slate-400">{audioVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioVolume}
                onChange={(e) => setAudioVolume(Number(e.target.value))}
                className="w-full h-4 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-600 range-lg focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              />
            </div>

            {/* Speaker + Buzzer Tests */}
            <div className="pt-3 border-t border-slate-700 space-y-2">
              <Button size="md" variant="secondary" onClick={handleSpeakerTest} fullWidth disabled={speakerBusy}>
                {speakerBusy ? 'Testing…' : 'Test Speaker'}
              </Button>
              <Button size="md" variant="secondary" onClick={handleBuzzerTest} fullWidth disabled={buzzerBusy}>
                {buzzerBusy ? 'Testing…' : 'Test Buzzer'}
              </Button>
            </div>
          </div>
        </Card>
      </section>
      )}

      {/* System Section */}
      {activeGroup === 'system' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Activity size={20} />
          <span className="flex-1">System</span>
        </h2>
        <Card>
          <div className="space-y-4">
            <InfoRow label="Version" value={versionValue} />
            <InfoRow label="Uptime" value={uptimeValue} />
            <InfoRow label="CPU Temp" value={cpuTempValue} />
            <InfoRow label="Battery" value={batteryValue} />
            <InfoRow label="Storage" value={storageValue} />
            <InfoRow label="Network" value={networkValue} />
            <InfoRow label="GPS" value={gpsValue} />
          </div>
        </Card>
      </section>
      )}

      {/* Device Hardware Section */}
      {activeGroup === 'system' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Activity size={20} />
          <span className="flex-1">Device Hardware</span>
        </h2>
        <Card>
          <div className="space-y-4">
            <InfoRow label="System" value={<span className={systemStatusClass}>{systemStatusLabel}</span>} />
            <InfoRow label="Network" value={networkValue} />
            <InfoRow
              label="GPS"
              value={
                <span className={gpsStatusClass}>
                  {gpsStatusLabel}{gpsHdopValue ? ` • ${gpsHdopValue}` : ''}
                </span>
              }
            />
            <InfoRow label="Remote ID" value={<span className={ridVariant === 'success' ? 'text-emerald-400' : 'text-red-400'}>{ridLabel}</span>} />
            <InfoRow label="Dev Mode" value={devEnabled ? 'Enabled' : 'Disabled'} />
          </div>
        </Card>
      </section>
      )}

      {/* Power & Reboot Section */}
      {activeGroup === 'system' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Power size={20} />
          <span className="flex-1">Power & Restart</span>
          <SaveStatus state={systemSaveState} />
        </h2>
        <Card>
          <div className="space-y-3">
            <HoldButton
              label="Hold to Reboot UI"
              icon={<RotateCcw size={18} />}
              variant="secondary"
              size="md"
              holdDuration={2000}
              onComplete={handleRebootUI}
              fullWidth
            />
            <HoldButton
              label="Hold to Reboot Device"
              icon={<Power size={18} />}
              variant="danger"
              size="md"
              holdDuration={3000}
              onComplete={handleRebootDevice}
              fullWidth
            />
          </div>
        </Card>
      </section>
      )}

      {/* Sensors Section */}
      {activeGroup === 'sensors' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Wifi size={20} />
          <span className="flex-1">Sensors</span>
        </h2>
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-slate-300 font-medium">Front-end Controller</span>
              <Chip label={controllerLabel} variant={controllerVariant as any} size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-slate-300 font-medium">FPV Scanner</span>
              <Chip label={fpvLabel} variant={fpvVariant as any} size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-slate-300 font-medium">Remote ID Sensor</span>
              <Chip label={ridLabel} variant={ridVariant as any} size="sm" />
            </div>
          </div>
        </Card>

        <div className="mt-4">
          <h3 className="text-[18px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Radio size={18} />
            Network System (RF Sensor)
          </h3>
          <Card>
            <div className="space-y-4">
              <InfoRow label="Status" value={<span className={rfStatusClass}>{rfStatusLabel}</span>} />
              <InfoRow label="Link" value={String(rfSensor?.link ?? 'down').toUpperCase()} />
              <InfoRow label="Endpoint" value={rfSensor?.endpoint ?? 'ip:192.168.10.2'} />
              <InfoRow label="Scan Active" value={rfSensor?.scan_active ? 'Yes' : 'No'} />
              <InfoRow label="Last Response" value={formatAgo(rfSensor?.last_response_ago_ms)} />
              {rfSensor?.last_error ? (
                <InfoRow label="Last Error" value={rfSensor.last_error} />
              ) : null}
              <div className="text-[12px] text-slate-500 pt-1">
                Live updates require Scan Service running. Targets auto-expire when RF disappears.
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-4">
          <h3 className="text-[18px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Radio size={18} />
            Network System (Remote ID)
          </h3>
          <Card>
            <div className="space-y-4">
              <InfoRow label="Status" value={<span className={ridNetStatusClass}>{ridNetStatusLabel}</span>} />
              <InfoRow label="Capture Active" value={ridStatus?.capture_active ? 'Yes' : 'No'} />
              <InfoRow label="Last Response" value={formatAgo(ridStatus?.last_response_ago_ms)} />
              <InfoRow label="Contacts" value={String(ridStatus?.contacts ?? 0)} />
              <InfoRow label="Decodes (60s)" value={String(ridStatus?.decode_rate_60s ?? 0)} />
              {ridStatus?.last_error ? (
                <InfoRow label="Last Error" value={ridStatus.last_error} />
              ) : null}
              <div className="text-[12px] text-slate-500 pt-1">
                Live capture runs continuously; contacts expire automatically when no broadcasts are detected.
              </div>
            </div>
          </Card>
        </div>
      </section>
      )}

      {/* Maps Section */}
      {activeGroup === 'maps' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Map size={20} />
          <span className="flex-1">Maps</span>
          <SaveStatus state={mapsSaveState} />
        </h2>
        <Card>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="text-[15px] text-slate-300 font-medium">Map Mode</div>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Online"
                  active={mapMode === 'online'}
                  size="md"
                  onClick={() => {
                    setMapMode('online');
                    const packId = offlinePackId || 'asia';
                    emitMapsChange('online', packId);
                    commitMapsSettings({ mode: 'online', offline_pack_id: packId });
                  }}
                />
                <Chip
                  label="Auto"
                  active={mapMode === 'auto'}
                  size="md"
                  onClick={() => {
                    setMapMode('auto');
                    const packId = offlinePackId || 'asia';
                    emitMapsChange('auto', packId);
                    commitMapsSettings({ mode: 'auto', offline_pack_id: packId });
                  }}
                />
                <Chip
                  label="Offline"
                  active={mapMode === 'offline'}
                  size="md"
                  onClick={() => {
                    setMapMode('offline');
                    const packId = offlinePackId || 'asia';
                    emitMapsChange('offline', packId);
                    commitMapsSettings({ mode: 'offline', offline_pack_id: packId });
                  }}
                />
              </div>
              <div className="text-[12px] text-slate-500">
                Auto switches to offline when there is no internet.
              </div>
            </div>

            <InfoRow label="Offline Pack" value={`${offlinePackId || 'asia'}.mbtiles`} />
            <InfoRow label="Pack Status" value={mbtilesStatusLabel} />
            <InfoRow label="Pack Size" value={mbtilesSizeLabel} />
            <InfoRow label="PMTiles (legacy)" value={`${pmtilesStatusLabel} • ${pmtilesSizeLabel}`} />
          </div>
        </Card>
      </section>
      )}

      {/* Alert Presets Section */}
      {activeGroup === 'alerts' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Bell size={20} />
          <span className="flex-1">Alert Presets</span>
          <SaveStatus state={alertsSaveState} />
        </h2>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Chip
              label="Balanced"
              active={alertPreset === 'Balanced'}
              size="md"
              onClick={() => {
                if (alertPreset === 'Balanced') return;
                setAlertPreset('Balanced');
                commitAlertsSettings({ preset: 'Balanced' });
              }}
            />
            <Chip
              label="Critical Focus"
              active={alertPreset === 'Critical Focus'}
              size="md"
              onClick={() => {
                if (alertPreset === 'Critical Focus') return;
                setAlertPreset('Critical Focus');
                commitAlertsSettings({ preset: 'Critical Focus' });
              }}
            />
            <Chip
              label="Training"
              active={alertPreset === 'Training'}
              size="md"
              onClick={() => {
                if (alertPreset === 'Training') return;
                setAlertPreset('Training');
                commitAlertsSettings({ preset: 'Training' });
              }}
            />
          </div>
        </Card>
      </section>
      )}

      {/* Video Capture Section */}
      {activeGroup === 'video' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Video size={20} />
          <span className="flex-1">Video Capture</span>
          <SaveStatus state={videoSaveState} />
        </h2>
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-slate-300 font-medium">Auto Recording</span>
              <Chip
                label="Disabled"
                variant="default"
                size="md"
                onClick={async () => {
                  setVideoSaveState('saving');
                  const res = await videoCaptureToggle(true);
                  setVideoSaveState(res.ok ? 'saved' : (res.error === 'not supported in this build' ? 'unsupported' : 'error'));
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-slate-300 font-medium">Storage Used</span>
              <span className="text-[14px] text-slate-400">2.4 GB</span>
            </div>
          </div>
        </Card>
      </section>
      )}

      {/* Network Section */}
      {activeGroup === 'network' && (
      <section>
        <NetworkSettings />
      </section>
      )}

      {/* Debug Section */}
      {activeGroup === 'diagnostics' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Code size={20} />
          <span className="flex-1">Debug</span>
        </h2>
        <Card>
          <div className="space-y-3">
            <div className="text-[14px] text-slate-300 font-medium mb-2">Raw Telemetry</div>
            <div className="bg-slate-950 rounded-2xl p-4 overflow-x-auto max-h-[300px] overflow-y-auto scroll-panel">
              <pre className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap">
{`{
  "front_end": {
    "status": "connected",
    "rssi": -45,
    "uptime": 302567
  },
  "fpv": {
    "scanning": true,
    "locked_channels": [
      { "band": "5.8GHz", "freq": 5860, "rssi": -68 }
    ]
  },
  "remote_id": {
    "active_contacts": 2,
    "last_update": 1642534789
  },
  "gps": {
    "lat": 37.7749,
    "lng": -122.4194,
    "alt": 52,
    "satellites": 12,
    "hdop": 1.2
  }
}`}
              </pre>
            </div>
          </div>
        </Card>
      </section>
      )}

      {/* RF Scanning (Advanced) Section */}
      {activeGroup === 'diagnostics' && (
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Radio size={20} />
          <span className="flex-1">RF Scanning (Advanced)</span>
        </h2>
        <Card>
          <button
            onClick={() => setShowRfSettings(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[72px]"
          >
            <div className="flex-1 text-left">
              <div className="text-[14px] font-semibold text-slate-100 mb-1">
                Advanced Scanning Configuration
              </div>
              <div className="text-[12px] text-slate-400">
                Scan profiles, sweep plans, detection & tracking
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </Card>
      </section>
      )}
    </div>
  );
}

function InfoRow({ label, value, subLabel }: { label: string; value: string | number | React.ReactNode; subLabel?: string }) {
  return (
    <div className="flex justify-between items-center gap-4 min-h-[56px] py-1">
      <div className="min-w-0">
        <div className="text-[15px] text-slate-300 font-medium">{label}</div>
        {subLabel ? (
          <div className="text-[12px] text-slate-500">{subLabel}</div>
        ) : null}
      </div>
      <span className="text-[14px] text-slate-400 text-right break-words max-w-[55%]">{value}</span>
    </div>
  );
}
