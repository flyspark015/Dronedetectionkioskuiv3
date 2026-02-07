import { useEffect, useMemo, useState } from 'react';
import {
  Bluetooth,
  RefreshCw,
  Wifi,
  ShieldCheck,
  ShieldOff,
  Link,
  Unlink,
  Trash2,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Chip } from './Chip';
import {
  getNetworkStatus,
  scanWifi,
  connectWifi,
  disconnectWifi,
  forgetWifi,
  setWifiRadio,
  getBluetoothStatus,
  startBluetoothScan,
  stopBluetoothScan,
  pairBluetooth,
  connectBluetooth,
  disconnectBluetooth,
  unpairBluetooth,
  setBluetoothPower,
  setBluetoothDiscoverable,
} from '@/app/services/network';

interface WifiNetwork {
  id: string;
  ssid: string;
  security: 'WPA2' | 'WPA3' | 'WEP' | 'Open' | 'Unknown';
  signalStrength: number;
  frequency: '2.4GHz' | '5GHz' | '6GHz' | 'Unknown';
  connected: boolean;
  saved: boolean;
}

interface BluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
  paired: boolean;
}

const normalizeSecurity = (value?: string): WifiNetwork['security'] => {
  const v = String(value || '').toUpperCase();
  if (!v || v === '--' || v === 'OPEN') return 'Open';
  if (v.includes('WPA3')) return 'WPA3';
  if (v.includes('WPA2')) return 'WPA2';
  if (v.includes('WEP')) return 'WEP';
  return 'Unknown';
};

const freqToBand = (freq?: number): WifiNetwork['frequency'] => {
  if (!freq || !Number.isFinite(freq)) return 'Unknown';
  if (freq >= 5900) return '6GHz';
  if (freq >= 4900) return '5GHz';
  return '2.4GHz';
};

function Divider() {
  return <div className="h-px bg-slate-700/70" />;
}

export function NetworkSettings() {
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [wifiStatus, setWifiStatus] = useState<any | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanBusy, setScanBusy] = useState(false);
  const [autoWifiScan, setAutoWifiScan] = useState(true);
  const [wifiError, setWifiError] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<WifiNetwork | null>(null);
  const [connectPassword, setConnectPassword] = useState('');
  const [connectShowPassword, setConnectShowPassword] = useState(false);
  const [manualSsid, setManualSsid] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualShowPassword, setManualShowPassword] = useState(false);
  const [lastWifiScanTs, setLastWifiScanTs] = useState<number | null>(null);

  const [btEnabled, setBtEnabled] = useState(true);
  const [btDiscoverable, setBtDiscoverable] = useState(true);
  const [btDevices, setBtDevices] = useState<BluetoothDevice[]>([]);
  const [btScanBusy, setBtScanBusy] = useState(false);
  const [autoBtScan, setAutoBtScan] = useState(true);
  const [btError, setBtError] = useState<string | null>(null);

  const formatWifiError = (error?: string | null, detail?: string | null) => {
    if (!error) return null;
    if (error === 'missing_password') return 'Password required for this network.';
    if (error === 'hidden_ssid') return 'Hidden network cannot be joined from the list.';
    if (error === 'ssh_guard') return 'Blocked to protect SSH (use force with a backup link).';
    if (detail) return `${error}: ${detail}`;
    return error;
  };

  const refreshStatus = async () => {
    const res = await getNetworkStatus();
    if (!res.ok) {
      setWifiError(formatWifiError(res.error, res.detail) || 'status_failed');
      return;
    }
    const wifi = res.data?.wifi || {};
    setWifiEnabled(wifi.enabled !== false);
    setWifiStatus(wifi);
    setWifiError(null);
  };

  const refreshWifiScan = async () => {
    if (scanBusy) return;
    setScanBusy(true);
    const res = await scanWifi();
    if (res.ok) {
      const items = Array.isArray(res.data?.networks) ? res.data.networks : [];
      setNetworks(items.map((item: any) => {
        const ssid = String(item.ssid || '');
        return {
          id: `${ssid}::${item.freq ?? ''}`,
          ssid: ssid || '<hidden>',
          security: normalizeSecurity(item.security),
          signalStrength: Number(item.signal ?? 0),
          frequency: freqToBand(Number(item.freq)),
          connected: Boolean(item.in_use),
          saved: Boolean(item.saved),
        } as WifiNetwork;
      }));
      setWifiError(null);
    } else {
      setWifiError(formatWifiError(res.error, res.detail) || 'scan_failed');
    }
    setScanBusy(false);
    setLastWifiScanTs(Date.now());
  };

  const refreshBluetooth = async () => {
    const res = await getBluetoothStatus();
    if (!res.ok) {
      setBtError(res.detail || res.error || 'bt_status_failed');
      return;
    }
    const bt = res.data?.bluetooth || {};
    setBtEnabled(bt.enabled !== false);
    setBtDiscoverable(bt.discoverable !== false);

    const discovered = Array.isArray(bt.discovered_devices) ? bt.discovered_devices : [];
    const paired = Array.isArray(bt.paired_devices) ? bt.paired_devices : [];
    const connected = Array.isArray(bt.connected_devices) ? bt.connected_devices : [];

    const map = new Map<string, BluetoothDevice>();
    const upsert = (item: any, patch: Partial<BluetoothDevice>) => {
      const mac = String(item.mac || '');
      if (!mac) return;
      const existing = map.get(mac) || { id: mac, name: String(item.name || mac), connected: false, paired: false };
      map.set(mac, { ...existing, ...patch });
    };

    discovered.forEach((d: any) => upsert(d, {}));
    paired.forEach((d: any) => upsert(d, { paired: true }));
    connected.forEach((d: any) => upsert(d, { connected: true, paired: true }));

    setBtDevices(Array.from(map.values()));
    setBtError(null);
  };

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      await refreshStatus();
      await refreshWifiScan();
      await refreshBluetooth();
      if (active) {
        // One quick bluetooth scan to populate the list.
        handleBluetoothScan();
        // If no Wi-Fi results yet, retry once.
        window.setTimeout(() => {
          if (active) refreshWifiScan();
        }, 1500);
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!autoWifiScan) return;
    let active = true;
    const timer = window.setInterval(() => {
      if (active) refreshWifiScan();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [autoWifiScan]);

  const handleWifiToggle = (enabled: boolean) => {
    setWifiEnabled(enabled);
    setWifiRadio(enabled).then((res) => {
      if (!res.ok) {
        setWifiEnabled(!enabled);
        setWifiError(formatWifiError(res.error, res.detail));
      }
      refreshStatus();
    });
  };

  const handleConnect = (network: WifiNetwork) => {
    if (network.security === 'Open') {
      connectWifi({ ssid: network.ssid }).then((res) => {
        if (!res.ok) setWifiError(formatWifiError(res.error, res.detail));
        refreshStatus();
        refreshWifiScan();
      });
      return;
    }
    setConnectTarget(network);
    setConnectPassword('');
    setConnectShowPassword(false);
  };

  const handlePasswordConnect = () => {
    if (!connectTarget) return;
    connectWifi({ ssid: connectTarget.ssid, password: connectPassword }).then((res) => {
      if (!res.ok) setWifiError(formatWifiError(res.error, res.detail));
      refreshStatus();
      refreshWifiScan();
    });
    setConnectTarget(null);
    setConnectPassword('');
    setConnectShowPassword(false);
  };

  const handleDisconnect = () => {
    disconnectWifi({ iface: wifiStatus?.iface }).then((res) => {
      if (!res.ok) setWifiError(formatWifiError(res.error, res.detail));
      refreshStatus();
      refreshWifiScan();
    });
  };

  const handleForget = (network: WifiNetwork) => {
    forgetWifi({ ssid: network.ssid }).then((res) => {
      if (!res.ok) setWifiError(formatWifiError(res.error, res.detail));
      refreshStatus();
      refreshWifiScan();
    });
  };

  const handleManualConnect = () => {
    if (!manualSsid) return;
    connectWifi({ ssid: manualSsid, password: manualPassword || undefined }).then((res) => {
      if (!res.ok) setWifiError(formatWifiError(res.error, res.detail));
      refreshStatus();
      refreshWifiScan();
    });
    setManualSsid('');
    setManualPassword('');
  };

  const handleBluetoothToggle = (enabled: boolean) => {
    setBtEnabled(enabled);
    setBluetoothPower(enabled).then((res) => {
      if (!res.ok) setBtEnabled(!enabled);
      refreshBluetooth();
    });
  };

  const handleDiscoverableToggle = (enabled: boolean) => {
    setBtDiscoverable(enabled);
    setBluetoothDiscoverable(enabled).then((res) => {
      if (!res.ok) setBtDiscoverable(!enabled);
      refreshBluetooth();
    });
  };

  const handleBluetoothScan = async () => {
    if (!btEnabled) return;
    setBtScanBusy(true);
    await startBluetoothScan();
    window.setTimeout(async () => {
      await refreshBluetooth();
      await stopBluetoothScan();
      setBtScanBusy(false);
    }, 3000);
  };

  useEffect(() => {
    if (!autoBtScan || !btEnabled) return;
    let active = true;
    const begin = async () => {
      const res = await startBluetoothScan();
      if (!res.ok) {
        setBtError(res.error || 'scan_failed');
        return;
      }
      setBtScanBusy(true);
    };
    begin();
    const timer = window.setInterval(() => {
      if (active) refreshBluetooth();
    }, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
      stopBluetoothScan().finally(() => setBtScanBusy(false));
    };
  }, [autoBtScan, btEnabled]);

  const connectedNetwork = useMemo(() => networks.find((n) => n.connected), [networks]);
  const savedNetworks = useMemo(() => networks.filter((n) => n.saved && !n.connected), [networks]);
  const availableNetworks = useMemo(() => networks.filter((n) => !n.saved && !n.connected), [networks]);
  const nearbyNetworks = useMemo(() => networks.filter((n) => !n.connected), [networks]);

  const connectedDevices = btDevices.filter((d) => d.connected);
  const pairedDevices = btDevices.filter((d) => d.paired && !d.connected);
  const availableDevices = btDevices.filter((d) => !d.paired);
  const hasAnyDevices = btDevices.length > 0;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Wifi size={20} />
          <span className="flex-1">Wi-Fi</span>
        </h2>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-slate-300 font-medium">Radio</span>
            <Chip label="On" active={wifiEnabled} onClick={() => handleWifiToggle(true)} size="sm" />
            <Chip label="Off" active={!wifiEnabled} onClick={() => handleWifiToggle(false)} size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-slate-300 font-medium">Auto-scan</span>
            <Chip label="On" active={autoWifiScan} onClick={() => setAutoWifiScan(true)} size="sm" />
            <Chip label="Off" active={!autoWifiScan} onClick={() => setAutoWifiScan(false)} size="sm" />
          </div>
          <Divider />
          <div className="space-y-2">
            <div className="text-[14px] text-slate-300 font-medium">Current</div>
            <div className="text-[13px] text-slate-400">
              SSID: <span className="text-slate-200">{wifiStatus?.ssid || '—'}</span>
            </div>
            <div className="text-[13px] text-slate-400">
              IP: <span className="text-slate-200">{wifiStatus?.ip || '—'}</span>
            </div>
            <div className="text-[13px] text-slate-400">
              Signal: <span className="text-slate-200">{wifiStatus?.signal ?? '—'}%</span>
            </div>
            <div className="text-[13px] text-slate-400">
              Default route: <span className="text-slate-200">{wifiStatus?.default_route_iface || '—'}</span>
            </div>
            <div className="text-[12px] text-slate-500">
              Scan results: {networks.length} {lastWifiScanTs ? `• ${new Date(lastWifiScanTs).toLocaleTimeString()}` : ''}
            </div>
          </div>
          {wifiError && (
            <div className="text-[12px] text-red-400">{wifiError}</div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw size={16} />}
              onClick={refreshWifiScan}
              disabled={scanBusy}
            >
              {scanBusy ? 'Scanning…' : 'Scan'}
            </Button>
            {connectedNetwork && (
              <Button
                size="sm"
                variant="warning"
                icon={<Unlink size={16} />}
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            )}
          </div>
        </Card>
      </section>

      {connectTarget && (
        <section>
          <Card className="space-y-3">
            <div className="text-[14px] text-slate-200 font-semibold">
              Connect to {connectTarget.ssid}
            </div>
            <div className="text-[12px] text-slate-500">
              Security: {connectTarget.security}
            </div>
            <input
              className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500"
              type={connectShowPassword ? 'text' : 'password'}
              value={connectPassword}
              onChange={(e) => setConnectPassword(e.target.value)}
              placeholder="Password"
            />
            <label className="text-[12px] text-slate-400 flex items-center gap-2">
              <input
                type="checkbox"
                checked={connectShowPassword}
                onChange={(e) => setConnectShowPassword(e.target.checked)}
              />
              Show password
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConnectTarget(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handlePasswordConnect} disabled={!connectPassword}>
                Connect
              </Button>
            </div>
          </Card>
        </section>
      )}

      <section>
        <Card className="space-y-4">
          <div className="text-[14px] text-slate-300 font-medium">Saved Networks</div>
          <div className="space-y-3">
            {savedNetworks.length === 0 && (
              <div className="text-[12px] text-slate-500">No saved networks.</div>
            )}
            {savedNetworks.map((network) => (
              <div key={network.id} className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-[14px] text-slate-100 font-semibold">{network.ssid}</div>
                  <div className="text-[12px] text-slate-400 flex items-center gap-2">
                    {network.security !== 'Open' ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                    <span>{network.security}</span>
                    <span>•</span>
                    <span>{network.frequency}</span>
                    <span>•</span>
                    <span>{network.signalStrength}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="secondary" icon={<Link size={16} />} onClick={() => handleConnect(network)}>
                    Connect
                  </Button>
                  <Button size="sm" variant="warning" icon={<Trash2 size={16} />} onClick={() => handleForget(network)}>
                    Forget
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card className="space-y-4">
          <div className="text-[14px] text-slate-300 font-medium">
            {availableNetworks.length > 0 ? 'Available Networks' : 'Nearby Networks'}
          </div>
          <div className="space-y-3">
            {(availableNetworks.length === 0 && nearbyNetworks.length === 0) && (
              <div className="text-[12px] text-slate-500">No networks found. Tap Scan to refresh.</div>
            )}
            {(availableNetworks.length > 0 ? availableNetworks : nearbyNetworks).map((network) => (
              <div key={network.id} className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-[14px] text-slate-100 font-semibold">{network.ssid}</div>
                  <div className="text-[12px] text-slate-400 flex items-center gap-2">
                    {network.security !== 'Open' ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                    <span>{network.security}</span>
                    <span>•</span>
                    <span>{network.frequency}</span>
                    <span>•</span>
                    <span>{network.signalStrength}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="secondary" icon={<Link size={16} />} onClick={() => handleConnect(network)}>
                    Connect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card className="space-y-3">
          <div className="text-[14px] text-slate-300 font-medium">Manual Connect</div>
          <input
            className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500"
            value={manualSsid}
            onChange={(e) => setManualSsid(e.target.value)}
            placeholder="SSID"
          />
          <input
            className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500"
            type={manualShowPassword ? 'text' : 'password'}
            value={manualPassword}
            onChange={(e) => setManualPassword(e.target.value)}
            placeholder="Password (optional)"
          />
          <label className="text-[12px] text-slate-400 flex items-center gap-2">
            <input
              type="checkbox"
              checked={manualShowPassword}
              onChange={(e) => setManualShowPassword(e.target.checked)}
            />
            Show password
          </label>
          <Button size="sm" onClick={handleManualConnect} disabled={!manualSsid}>
            Connect
          </Button>
        </Card>
      </section>

      <section>
        <h2 className="text-[19px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Bluetooth size={20} />
          <span className="flex-1">Bluetooth</span>
        </h2>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-slate-300 font-medium">Radio</span>
            <Chip label="On" active={btEnabled} onClick={() => handleBluetoothToggle(true)} size="sm" />
            <Chip label="Off" active={!btEnabled} onClick={() => handleBluetoothToggle(false)} size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-slate-300 font-medium">Discoverable</span>
            <Chip label="On" active={btDiscoverable} onClick={() => handleDiscoverableToggle(true)} size="sm" />
            <Chip label="Off" active={!btDiscoverable} onClick={() => handleDiscoverableToggle(false)} size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-slate-300 font-medium">Auto-scan</span>
            <Chip label="On" active={autoBtScan} onClick={() => setAutoBtScan(true)} size="sm" />
            <Chip label="Off" active={!autoBtScan} onClick={() => setAutoBtScan(false)} size="sm" />
          </div>
          {btError && <div className="text-[12px] text-red-400">{btError}</div>}
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={16} />}
            onClick={handleBluetoothScan}
            disabled={btScanBusy}
          >
            {btScanBusy ? 'Scanning…' : 'Scan'}
          </Button>
        </Card>
      </section>

      <section>
        <Card className="space-y-4">
          <div className="text-[14px] text-slate-300 font-medium">Connected Devices</div>
          <div className="space-y-3">
            {connectedDevices.length === 0 && (
              <div className="text-[12px] text-slate-500">No connected devices.</div>
            )}
            {connectedDevices.map((device) => (
              <div key={device.id} className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-[14px] text-slate-100 font-semibold">{device.name}</div>
                  <div className="text-[12px] text-slate-400">{device.id}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Chip label="Connected" variant="success" size="sm" />
                  <Button
                    size="sm"
                    variant="warning"
                    icon={<Unlink size={16} />}
                    onClick={async () => {
                      const res = await disconnectBluetooth({ mac: device.id });
                      if (!res.ok) setBtError(res.error || 'disconnect_failed');
                      await refreshBluetooth();
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card className="space-y-4">
          <div className="text-[14px] text-slate-300 font-medium">Paired Devices</div>
          <div className="space-y-3">
            {pairedDevices.length === 0 && (
              <div className="text-[12px] text-slate-500">No paired devices.</div>
            )}
            {pairedDevices.map((device) => (
              <div key={device.id} className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-[14px] text-slate-100 font-semibold">{device.name}</div>
                  <div className="text-[12px] text-slate-400">{device.id}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Chip label="Paired" variant="info" size="sm" />
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Link size={16} />}
                    onClick={async () => {
                      const res = await connectBluetooth({ mac: device.id });
                      if (!res.ok) setBtError(res.error || 'connect_failed');
                      await refreshBluetooth();
                    }}
                  >
                    Connect
                  </Button>
                  <Button
                    size="sm"
                    variant="warning"
                    icon={<Trash2 size={16} />}
                    onClick={async () => {
                      const res = await unpairBluetooth({ mac: device.id });
                      if (!res.ok) setBtError(res.error || 'unpair_failed');
                      await refreshBluetooth();
                    }}
                  >
                    Unpair
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card className="space-y-4">
          <div className="text-[14px] text-slate-300 font-medium">Available Devices</div>
          <div className="space-y-3">
            {availableDevices.length === 0 && (
              <div className="text-[12px] text-slate-500">
                {hasAnyDevices ? 'No available devices.' : 'No devices found. Tap Scan to refresh.'}
              </div>
            )}
            {availableDevices.map((device) => (
              <div key={device.id} className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-[14px] text-slate-100 font-semibold">{device.name}</div>
                  <div className="text-[12px] text-slate-400">{device.id}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Link size={16} />}
                    onClick={async () => {
                      const res = await pairBluetooth({ mac: device.id });
                      if (!res.ok) setBtError(res.error || 'pair_failed');
                      await refreshBluetooth();
                    }}
                  >
                    Pair
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

export default NetworkSettings;
