import { useEffect, useState, useRef, Component, type ReactNode } from 'react';
import { StatusBar } from './components/StatusBar';
import { StatusDrawer } from './components/StatusDrawer';
import { PanicControls } from './components/PanicControls';
import { TabBar } from './components/TabBar';
import { HomeScreen } from './components/HomeScreen';
import { AlertsScreen } from './components/AlertsScreen';
import { LogsScreen } from './components/LogsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ContactDetailsSheet } from './components/ContactDetailsSheet';
import { VideoPreviewOverlay } from './components/VideoPreviewOverlay';
import { Esp32DebugPanel } from './components/dev/Esp32DebugPanel';
import { fetchStatusSnapshot } from './services/status';
import { webSocketService } from './services/websocket';
import { sendEsp32Command } from './services/esp32Commands';
import { playSound, preloadAudioAssets, resumeAudio } from './services/audioCommands';
import type { Contact } from './types/contacts';

type SettingsErrorBoundaryProps = {
  children: ReactNode;
  onReset: () => void;
};

type SettingsErrorBoundaryState = {
  error: Error | null;
};

class SettingsErrorBoundary extends Component<SettingsErrorBoundaryProps, SettingsErrorBoundaryState> {
  state: SettingsErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Settings] crashed:', error);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/40 px-6 py-4 text-center">
            <div className="text-sm font-semibold text-rose-100">Settings crashed</div>
            <div className="mt-1 text-[11px] text-rose-200/80">{this.state.error.message}</div>
            <button
              className="mt-3 rounded-full border border-rose-700/60 bg-rose-900/40 px-3 py-1 text-[12px] text-rose-100"
              onClick={this.handleReset}
            >
              Reset Settings
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const normalizeSource = (value?: string) => {
  if (!value) return 'live';
  const v = String(value).toLowerCase();
  return v === 'replay' || v === 'ek_replay' || v === 'raw_replay' ? 'replay' : 'live';
};

const coerceMs = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num < 1e12 ? Math.round(num * 1000) : Math.round(num);
};

const isValidCoord = (coords?: { lat?: any; lon?: any }) => {
  if (!coords) return false;
  return Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lon));
};

const mapRidToUiContact = (rid: any, envelope?: any) => {
  if (!rid || !rid.id) return null;
  const now = Date.now();
  const lastSeen =
    coerceMs(rid.last_seen_ts) ??
    coerceMs(rid.last_ts) ??
    coerceMs(rid.ts_ms) ??
    coerceMs(envelope?.timestamp) ??
    now;
  const firstSeen = coerceMs(rid.first_seen_ts) ?? lastSeen;

  const pilotCoords = isValidCoord(rid.pilot_coords)
    ? rid.pilot_coords
    : (Number.isFinite(Number(rid.operator_lat)) && Number.isFinite(Number(rid.operator_lon))
      ? { lat: Number(rid.operator_lat), lon: Number(rid.operator_lon) }
      : null);

  const homeCoords = isValidCoord(rid.home_coords)
    ? rid.home_coords
    : (Number.isFinite(Number(rid.home_lat)) && Number.isFinite(Number(rid.home_lon))
      ? { lat: Number(rid.home_lat), lon: Number(rid.home_lon) }
      : null);

  return {
    id: rid.id,
    type: 'REMOTE_ID',
    source: normalizeSource(rid.source ?? envelope?.source),
    severity: rid.severity ?? 'medium',
    first_seen_ts: firstSeen,
    last_seen_ts: lastSeen,
    stale_after_ms: rid.stale_after_ms ?? 15_000,
    remote_id: {
      basic_id: rid.basic_id ?? null,
      operator_id: rid.operator_id ?? null,
      model: rid.msg_type ?? rid.model ?? null,
      serial_id: rid.serial_id ?? rid.basic_id ?? null,
      drone_coords: (rid.lat != null && rid.lon != null)
        ? { lat: rid.lat, lon: rid.lon, alt_m: rid.alt_m ?? null }
        : (isValidCoord(rid.drone_coords) ? { ...rid.drone_coords, alt_m: rid.drone_coords?.alt_m ?? null } : null),
      pilot_coords: pilotCoords,
      home_coords: homeCoords,
    },
  };
};

const mapIncomingContact = (incoming: any, envelope?: any) => {
  const payload = incoming?.contact ?? incoming?.data ?? incoming;
  if (!payload) return null;

  const now = Date.now();
  const lastSeen =
    coerceMs(payload.last_seen_ts) ??
    coerceMs(payload.last_ts) ??
    coerceMs(envelope?.timestamp) ??
    now;
  const firstSeen = coerceMs(payload.first_seen_ts) ?? lastSeen;
  const source = normalizeSource(payload.source ?? envelope?.source);

  if (payload.type === 'UNKNOWN_RF' || payload.unknown_rf) {
    return {
      id: payload.id ?? `rf:${payload.unknown_rf?.center_hz ?? 'unknown'}`,
      type: 'UNKNOWN_RF',
      source,
      severity: payload.severity ?? 'info',
      first_seen_ts: firstSeen,
      last_seen_ts: lastSeen,
      stale_after_ms: payload.stale_after_ms ?? 7_000,
      unknown_rf: payload.unknown_rf ?? {},
    };
  }

  if (payload.type === 'FPV_LINK' && payload.fpv_link) {
    return {
      ...payload,
      source,
      first_seen_ts: firstSeen,
      last_seen_ts: lastSeen,
      stale_after_ms: payload.stale_after_ms ?? 15_000,
    };
  }

  if (payload.type === 'REMOTE_ID' && payload.remote_id) {
    return {
      ...payload,
      source,
      first_seen_ts: firstSeen,
      last_seen_ts: lastSeen,
      stale_after_ms: payload.stale_after_ms ?? 15_000,
    };
  }

  return mapRidToUiContact(payload, envelope);
};

const mockAlerts = [
  {
    id: 'alert-1',
    contactId: 'rid-1',
    severity: 'critical' as const,
    title: 'Critical: New Remote ID Contact',
    message: 'DJI Mavic 3 detected at 245m',
    timestamp: new Date(Date.now() - 30000),
    status: 'active' as const
  },
  {
    id: 'alert-2',
    contactId: 'fpv-1',
    severity: 'high' as const,
    title: 'FPV Signal Locked',
    message: 'Strong signal on 5860 MHz',
    timestamp: new Date(Date.now() - 15000),
    status: 'active' as const
  },
  {
    id: 'alert-3',
    contactId: 'rid-2',
    severity: 'medium' as const,
    title: 'Remote ID Contact',
    message: 'Autel EVO II at 487m',
    timestamp: new Date(Date.now() - 120000),
    status: 'acknowledged' as const
  }
];

const mockLogs = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 5000),
    level: 'info' as const,
    source: 'FPV Scanner',
    message: 'Channel scan completed, 3 signals detected',
    tags: ['scan']
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 30000),
    level: 'warn' as const,
    source: 'Remote ID',
    message: 'New contact detected: DJI Mavic 3',
    tags: ['contact', 'priority']
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 60000),
    level: 'info' as const,
    source: 'GPS',
    message: 'GPS fix acquired, 12 satellites'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 120000),
    level: 'error' as const,
    source: 'Storage',
    message: 'Low storage warning: 18% remaining',
    tags: ['system']
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 180000),
    level: 'info' as const,
    source: 'Front-end Controller',
    message: 'Connection established, RSSI: -45dBm'
  }
];

export default function App() {
  const initialTab = (() => {
    if (typeof window === 'undefined') return 'home';
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'alerts' || tab === 'logs' || tab === 'settings' || tab === 'home') {
      return tab;
    }
    return 'home';
  })();

  const [activeTab, setActiveTab] = useState<'home' | 'alerts' | 'logs' | 'settings'>(initialTab);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState(false);
  const [videoContactId, setVideoContactId] = useState<string>('');
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState(false);
  const [isPanicCollapsed, setIsPanicCollapsed] = useState(false);
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [settingsErrorKey, setSettingsErrorKey] = useState(0);

  // Real backend state (REST bootstrap; WS live updates in Step 5)
  const [statusSnapshot, setStatusSnapshot] = useState<any | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const startupSoundPlayedRef = useRef(false);
  const lastDroneAlarmTsRef = useRef(0);

  // TEMP TEST: Inject one FPV contact so controller command buttons can be validated.
  // Remove after FPV_LINK contacts are generated from real telemetry.
  const TEST_FPV_CONTACT: any = {
    id: 'fpv:test:1',
    type: 'FPV_LINK',
    severity: 'medium',
    isPinned: false,
    tags: [],
    first_seen_ts: Date.now(),
    last_seen_ts: Date.now(),
    stale_after_ms: 15000,
    lost_after_ms: 60000,
    fpv_link: {
      band: '5.8G',
      freq_hz: 5800000000,
      rssi_dbm: -55,
      lock_state: 'idle',
      threshold: 'Balanced',
      hit_count: 0,
    },
  };

  useEffect(() => {
    setContacts(prev => {
      if (prev.some((c:any) => c?.type === 'FPV_LINK')) return prev;
      return [TEST_FPV_CONTACT, ...prev];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let retryTimer: number | null = null;
    const attempt = () => {
      preloadAudioAssets()
        .then((ok) => {
          if (!active) return;
          if (ok) {
            setAudioReady(true);
            return;
          }
          setAudioReady(false);
          retryTimer = window.setTimeout(attempt, 1500);
        })
        .catch(() => {
          if (!active) return;
          setAudioReady(false);
          retryTimer = window.setTimeout(attempt, 1500);
        });
    };
    attempt();
    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      resumeAudio();
    };
    document.addEventListener('pointerdown', handler, { capture: true, once: true });
    return () => {
      document.removeEventListener('pointerdown', handler, true);
    };
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest?.('button');
      if (!button) return;
      if (button.getAttribute('data-ui-sound') === '1') return;
      if ((button as HTMLButtonElement).disabled) return;
      if (button.getAttribute('aria-disabled') === 'true') return;
      playSound('ui_click');
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [audioReady, setAudioReady] = useState<boolean>(false);
  const showLoading = !audioReady || !wsConnected;

  useEffect(() => {
    const existing = document.getElementById('audio-loading-overlay') as HTMLDivElement | null;
    if (!showLoading) {
      if (existing) existing.remove();
      return;
    }

    const overlay = existing || document.createElement('div');
    overlay.id = 'audio-loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(5, 10, 20, 0.92)';
    overlay.style.color = '#e2e8f0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'auto';
    overlay.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif';
    overlay.innerHTML = '<div style=\"text-align:center;\"><div style=\"font-size:18px;font-weight:600;\">Loading audio...</div><div style=\"margin-top:6px;font-size:12px;color:#94a3b8;\">Preparing speaker + WebSocket</div></div>';

    if (!existing) {
      document.body.appendChild(overlay);
    }

    return () => {
      if (overlay.parentElement) overlay.remove();
    };
  }, [showLoading]);
  const devEnabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1';

  const system = statusSnapshot?.system ?? {};
  const esp32 = statusSnapshot?.esp32 ?? {};
  const gps = statusSnapshot?.gps ?? {};
  const remoteId = statusSnapshot?.remote_id ?? {};
  const remoteIdHealth = remoteId?.health ?? {};

  const storageFreeGb = Number(system?.storage_free_gb);
  const storageTotalGb = Number(system?.storage_total_gb);
  const storagePercentFree = Number.isFinite(storageFreeGb) && Number.isFinite(storageTotalGb) && storageTotalGb > 0
    ? Math.max(0, Math.min(100, (storageFreeGb / storageTotalGb) * 100))
    : null;

  const rawBattery = Number(system?.battery_level ?? system?.battery_percent);
  const batteryLevel = Number.isFinite(rawBattery)
    ? (rawBattery <= 1 ? Math.round(rawBattery * 100) : Math.round(rawBattery))
    : null;

  const networkLabel = system?.network_status
    ?? system?.ip_address
    ?? system?.ip
    ?? system?.hostname
    ?? '—';

  const espLastTs = Number(esp32?.last_ts);
  const telemetryAgeSeconds = Number.isFinite(espLastTs) ? Math.max(0, (nowMs - espLastTs) / 1000) : null;

  const ridLastTs = Number(remoteId?.last_update_ts ?? remoteIdHealth?.updated_ts);
  const remoteIdAgeSeconds = Number.isFinite(ridLastTs) ? Math.max(0, (nowMs - ridLastTs) / 1000) : null;

  const gpsLastTs = Number(gps?.last_ts);
  const gpsAgeSeconds = Number.isFinite(gpsLastTs) ? Math.max(0, (nowMs - gpsLastTs) / 1000) : null;

  const remoteIdStateRaw = String(remoteId?.status ?? remoteIdHealth?.state ?? '').toLowerCase();
  const remoteIdActive = ['ok', 'active', 'connected', 'online'].includes(remoteIdStateRaw)
    || Boolean(remoteId?.replay_active)
    || Boolean(remoteId?.capture_active);

  // Status state (derived from backend)
  const statusState = {
    esp32Status: esp32?.status || 'DISCONNECTED',
    fpvScanState: statusSnapshot?.fpv?.scan_state || 'idle',
    gpsFixQuality: (gps?.fix_quality ?? gps?.mode ?? 0),
    gpsLatitude: (gps?.latitude ?? null),
    gpsLongitude: (gps?.longitude ?? null),
    gpsHdop: (gps?.hdop ?? null),
    cpuTemp: system?.cpu_temp_celsius ?? null,
    storagePercentFree,
    remoteIdStatus: remoteId?.status || 'UNKNOWN',
    remoteIdActive,
    replayActive: statusSnapshot?.replay?.active || false,
    timestamp: statusSnapshot?.timestamp ?? null,
    remoteIdLastUpdateTs: remoteId?.last_update_ts ?? null,
    telemetryAgeSeconds,
    remoteIdAgeSeconds,
    gpsAgeSeconds,
    batteryLevel,
    networkLabel,
  };

  // Check if there are any critical alerts
  const hasCriticalAlert = mockAlerts.some(a => a.severity === 'critical' && a.status === 'active');

  // REST bootstrap: fetch /api/v1/status on load, and when WS is disconnected poll every 10s
  useEffect(() => {
    let mounted = true;
    let timer: any = null;

    const load = async () => {
      try {
        const snap = await fetchStatusSnapshot();
        if (!mounted) return;
        setStatusSnapshot(snap);

        // If backend provides a contacts snapshot in future, hydrate here (optional)
        const snapshotContacts = (snap?.contacts ?? snap?.remote_id?.contacts ?? []) as any[];
        if (Array.isArray(snapshotContacts) && snapshotContacts.length > 0) {
          const mapped = snapshotContacts
            .map((c) => mapIncomingContact(c))
            .filter(Boolean) as any[];
          if (mapped.length > 0) setContacts(mapped as any);
        }
      } catch (e) {
        console.warn('[REST] /api/v1/status failed:', e);
      }
    };

    load();

    // Poll only if WS disconnected
    timer = setInterval(() => {
      if (!wsConnected) load();
    }, 10_000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [wsConnected]);

    // [WS] CONNECT EFFECT — canonical /api/v1/ws, envelope {type,timestamp,source,data}
  useEffect(() => {
    const onConnected = () => {
      setWsConnected(true);
      if (!startupSoundPlayedRef.current) {
        startupSoundPlayedRef.current = true;
        playSound('startup_bg');
      }
      // refresh status right after connect
      fetchStatusSnapshot()
        .then((snap) => setStatusSnapshot(snap))
        .catch((e) => console.warn('[WS] post-connect REST refresh failed:', e));
    };

    const onDisconnected = () => setWsConnected(false);

    const mergeCoords = (prev: any, next: any) => {
      if (isValidCoord(next)) {
        return { ...(prev || {}), ...(next || {}) };
      }
      return prev || next || null;
    };

    const mergeRemoteId = (prev: any, next: any) => {
      if (!prev) return next || null;
      if (!next) return prev;
      return {
        ...prev,
        ...next,
        drone_coords: mergeCoords(prev.drone_coords, next.drone_coords),
        pilot_coords: mergeCoords(prev.pilot_coords, next.pilot_coords),
        home_coords: mergeCoords(prev.home_coords, next.home_coords),
      };
    };

    const handleContactEvent = (incoming: any, envelope?: any) => {
      const ui = mapIncomingContact(incoming, envelope);
      if (!ui) return;

      if (envelope?.type === 'CONTACT_NEW' && (ui.type === 'REMOTE_ID' || ui.type === 'FPV_LINK')) {
        const now = Date.now();
        if (now - lastDroneAlarmTsRef.current > 3000) {
          lastDroneAlarmTsRef.current = now;
          playSound('drone_detected_alarm');
        }
      }

      if (envelope?.type === 'CONTACT_LOST') {
        setContacts((prev: any[]) => prev.filter((c) => c.id !== ui.id));
        return;
      }

      setContacts((prev: any[]) => {
        const idx = prev.findIndex((x) => x.id === ui.id);
        if (idx === -1) return [ui, ...prev].slice(0, 500);
        const next = prev.slice();
        const merged = { ...next[idx], ...ui, first_seen_ts: next[idx].first_seen_ts ?? ui.first_seen_ts };
        if (next[idx]?.type === 'REMOTE_ID' && ui?.type === 'REMOTE_ID') {
          merged.remote_id = mergeRemoteId(next[idx].remote_id, ui.remote_id);
        }
        next[idx] = merged;
        return next;
      });
    };

    const onTelemetry = (data: any) => {
      setStatusSnapshot((prev: any) => ({ ...(prev || {}), ...(data || {}) }));
    };

    const onReplayState = (data: any) => {
      setStatusSnapshot((prev: any) => ({
        ...(prev || {}),
        replay: { ...((prev || {}).replay || {}), ...(data || {}) },
      }));
    };

    webSocketService.on('connected', onConnected);
    webSocketService.on('disconnected', onDisconnected);

    webSocketService.on('TELEMETRY_UPDATE', onTelemetry);
    webSocketService.on('REPLAY_STATE', onReplayState);

    webSocketService.on('CONTACT_NEW', handleContactEvent);
    webSocketService.on('CONTACT_UPDATE', handleContactEvent);
    webSocketService.on('CONTACT_LOST', handleContactEvent);

    webSocketService.connect();

    return () => {
      webSocketService.off('connected', onConnected);
      webSocketService.off('disconnected', onDisconnected);

      webSocketService.off('TELEMETRY_UPDATE', onTelemetry);
      webSocketService.off('REPLAY_STATE', onReplayState);

      webSocketService.off('CONTACT_NEW', handleContactEvent);
      webSocketService.off('CONTACT_UPDATE', handleContactEvent);
      webSocketService.off('CONTACT_LOST', handleContactEvent);

      webSocketService.disconnect();
    };
  }, []);
const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactSheetOpen(true);
  };

  const handlePreviewVideo = (contactId: string) => {
    setVideoContactId(contactId);
    setIsContactSheetOpen(false);
    setIsVideoPreviewOpen(true);
  };

  const handleAlertClick = (alert: any) => {
    const contact = contacts.find(c => c.id === alert.contactId);
    if (contact) {
      handleContactClick(contact);
    }
  };

  // Determine panic control mode based on active tab
  const getPanicMode = (): 'home' | 'alerts' | 'minimal' => {
    if (activeTab === 'home') return 'home';
    if (activeTab === 'alerts') return 'alerts';
    return 'minimal';
  };

  // Calculate top padding based on critical alert banner
  const topPadding = hasCriticalAlert ? 'pt-[76px]' : 'pt-[52px]';

  return (
    <div className="app-shell bg-slate-950 text-slate-100">
      {/* Status Bar - Fixed at top */}
      <StatusBar
        hasCriticalAlert={hasCriticalAlert}
        esp32Status={wsConnected ? 'linked' : 'stale'}
        remoteIdStatus={statusState.remoteIdStatus === 'ok' ? 'connected' : 'degraded'}
        fpvScanState={statusState.fpvScanState}
        gpsFixQuality={statusState.gpsFixQuality}
        gpsHdop={statusState.gpsHdop}
        isReplayActive={isReplayMode}
        onOpenDrawer={() => setIsStatusDrawerOpen(true)}
        showDevButton={devEnabled}
        isDevOpen={isDevPanelOpen}
        onToggleDev={() => setIsDevPanelOpen((prev) => !prev)}
        telemetryAgeSeconds={statusState.telemetryAgeSeconds ?? undefined}
        remoteIdAgeSeconds={statusState.remoteIdAgeSeconds ?? undefined}
        gpsAgeSeconds={statusState.gpsAgeSeconds ?? undefined}
      />

      {/* Status Drawer */}
      <StatusDrawer
        isOpen={isStatusDrawerOpen}
        onClose={() => setIsStatusDrawerOpen(false)}
        storagePercentFree={statusState.storagePercentFree}
        telemetryAgeSeconds={statusState.telemetryAgeSeconds}
        cpuTemp={statusState.cpuTemp}
        batteryLevel={statusState.batteryLevel}
        networkLabel={statusState.networkLabel}
        remoteIdActive={statusState.remoteIdActive}
      />

      {/* Main Content Area - Fills remaining space */}
      <div className="app-shell-content">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <HomeScreen
            contacts={contacts}
            onContactClick={handleContactClick}
            scanState={statusState.fpvScanState}
            onPanicCollapse={setIsPanicCollapsed}
            hasCriticalAlert={hasCriticalAlert}
            gpsFixQuality={statusState.gpsFixQuality}
            gpsLatitude={statusState.gpsLatitude}
            gpsLongitude={statusState.gpsLongitude}
          />
        </div>
        <div className={activeTab === 'alerts' ? 'block' : 'hidden'}>
          <AlertsScreen
            alerts={mockAlerts}
            onAckAll={() => console.log('Ack all')}
            onMute={() => setIsMuted(!isMuted)}
            onMuteFpv={() => console.log('Mute FPV')}
            onMuteRemoteId={() => console.log('Mute Remote ID')}
            onMuteDuration={(minutes) => console.log('Mute for', minutes, 'minutes')}
            onAlertClick={handleAlertClick}
            isMuted={isMuted}
            hasCriticalAlert={hasCriticalAlert}
          />
        </div>
        <div className={activeTab === 'logs' ? 'block' : 'hidden'}>
          <LogsScreen
            logs={mockLogs}
            onExportCsv={() => console.log('Export CSV')}
            onExportJson={() => console.log('Export JSON')}
            hasCriticalAlert={hasCriticalAlert}
            isReplayMode={isReplayMode}
            onToggleReplay={setIsReplayMode}
          />
        </div>
        <div className={activeTab === 'settings' ? 'flex h-full min-h-0 flex-col' : 'hidden'}>
          <SettingsErrorBoundary onReset={() => setSettingsErrorKey((prev) => prev + 1)}>
            <SettingsScreen
              key={settingsErrorKey}
              hasCriticalAlert={hasCriticalAlert}
              statusSnapshot={statusSnapshot}
              devEnabled={devEnabled}
              onOpenDevPanel={() => setIsDevPanelOpen(true)}
            />
          </SettingsErrorBoundary>
        </div>
      </div>

      {/* Context-Aware Panic Controls - Overlays content but never blocks tabs */}
      <PanicControls
        mode={getPanicMode()}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        onAck={() => console.log('Acknowledge')}
        onStopScan={() => sendEsp32Command('FPV_SCAN_STOP', { timeout_s: 3 })}
        onLockStrongest={() => sendEsp32Command('FPV_LOCK_STRONGEST', { timeout_s: 3 })}
        isCollapsed={isPanicCollapsed}
      />

      {/* Tab Bar - Fixed at bottom */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contact Details Bottom Sheet */}
      <ContactDetailsSheet
        contact={selectedContact}
        isOpen={isContactSheetOpen}
        onClose={() => {
          setIsContactSheetOpen(false);
          setSelectedContact(null);
        }}
        onPreviewVideo={handlePreviewVideo}
      />

      {/* Video Preview Overlay */}
      <VideoPreviewOverlay
        isOpen={isVideoPreviewOpen}
        onClose={() => setIsVideoPreviewOpen(false)}
        contactId={videoContactId}
      />

      {devEnabled && (
        <Esp32DebugPanel
          isOpen={isDevPanelOpen}
          onClose={() => setIsDevPanelOpen(false)}
          statusSnapshot={statusSnapshot}
          wsConnected={wsConnected}
        />
      )}
    </div>
  );
}
