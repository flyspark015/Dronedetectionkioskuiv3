import { useState, useEffect } from 'react';
import { ChevronLeft, Radio, RefreshCw, RotateCcw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { Chip } from '../Chip';
import { rfScanAction } from '@/app/services/settings';

interface HealthDiagnosticsProps {
  onBack: () => void;
}

export function HealthDiagnostics({ onBack }: HealthDiagnosticsProps) {
  // Mock health data - would come from actual telemetry
  const [health, setHealth] = useState({
    connection_status: 'connected' as 'connected' | 'reconnecting' | 'error',
    current_plan_name: 'VTX_58',
    current_center_hz: 5795_000_000,
    sweep_rate_steps_per_sec: 45.2,
    estimated_cycle_time_s: 2.4,
    contacts_count: 3,
    peaks_per_sec: 12.8,
    last_error: undefined as string | undefined,
    telemetry_age_s: 1.2
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Simulate telemetry updates
    const interval = setInterval(() => {
      setHealth(prev => ({
        ...prev,
        telemetry_age_s: prev.telemetry_age_s + 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleReconnect = async () => {
    setIsRefreshing(true);
    const res = await rfScanAction('rf_sensor_reconnect');
    if (!res.ok) {
      alert('Not supported in this build');
      setIsRefreshing(false);
      return;
    }
    setTimeout(() => {
      setIsRefreshing(false);
      setHealth(prev => ({ ...prev, telemetry_age_s: 0 }));
    }, 2000);
  };

  const handleRestartScanning = () => {
    const confirmed = window.confirm('Restart scanning?');
    if (confirmed) {
      rfScanAction('rf_scan_restart').then((res) => {
        if (!res.ok) alert('Not supported in this build');
      });
    }
  };

  const handleResetToSafe = () => {
    const confirmed = window.confirm('Reset to Safe Profile? This will overwrite current settings.');
    if (confirmed) {
      rfScanAction('rf_scan_reset_safe').then((res) => {
        if (!res.ok) alert('Not supported in this build');
      });
    }
  };

  const getConnectionChip = () => {
    switch (health.connection_status) {
      case 'connected':
        return <Chip label="Connected" variant="success" size="sm" />;
      case 'reconnecting':
        return <Chip label="Reconnecting..." variant="warning" size="sm" />;
      case 'error':
        return <Chip label="Error" variant="danger" size="sm" />;
    }
  };

  const getTelemetryFreshness = () => {
    if (health.telemetry_age_s < 3) {
      return { label: 'Fresh', color: 'text-green-400' };
    } else if (health.telemetry_age_s < 10) {
      return { label: 'Recent', color: 'text-blue-400' };
    } else {
      return { label: 'Stale', color: 'text-amber-400' };
    }
  };

  const freshness = getTelemetryFreshness();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700"
        >
          <ChevronLeft size={20} className="text-slate-300" />
        </button>
        <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Health & Diagnostics</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        {/* Connection Status */}
        <Card>
          <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio size={20} className="text-blue-400" />
            <span className="text-[14px] font-semibold text-slate-100">RF Sensor Link</span>
          </div>
          {getConnectionChip()}
        </div>

          {health.connection_status === 'error' && (
            <div className="bg-red-900/30 border border-red-600 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-[12px] text-red-300">
                  Connection lost. Check sensor link and power.
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            <Clock size={14} />
            <span>Telemetry age: {health.telemetry_age_s.toFixed(1)}s</span>
            <span className={`font-semibold ${freshness.color}`}>({freshness.label})</span>
          </div>
        </Card>

        {/* Real-time Metrics */}
        <Card>
          <div className="space-y-3">
            <div className="text-[14px] font-semibold text-slate-100 mb-3">Live Metrics</div>
            
            <MetricRow
              label="Current Plan"
              value={health.current_plan_name}
            />
            <MetricRow
              label="Center Frequency"
              value={`${(health.current_center_hz / 1_000_000).toFixed(1)} MHz`}
            />
            <MetricRow
              label="Sweep Rate"
              value={`${health.sweep_rate_steps_per_sec.toFixed(1)} steps/sec`}
            />
            <MetricRow
              label="Cycle Time"
              value={`${health.estimated_cycle_time_s.toFixed(2)}s`}
            />
            <MetricRow
              label="Active Contacts"
              value={health.contacts_count.toString()}
            />
            <MetricRow
              label="Peaks/sec"
              value={health.peaks_per_sec.toFixed(1)}
            />
          </div>
        </Card>

        {/* Last Error (if any) */}
        {health.last_error && (
          <Card>
            <div className="space-y-2">
              <div className="text-[14px] font-semibold text-slate-100">Last Error</div>
              <div className="bg-red-900/30 border border-red-600 rounded-xl p-3">
                <div className="text-[12px] text-red-300 font-mono">
                  {health.last_error}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <div className="space-y-2">
            <div className="text-[14px] font-semibold text-slate-100 mb-3">Actions</div>
            
            <Button
              size="md"
              variant="secondary"
              icon={isRefreshing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              onClick={handleReconnect}
              disabled={isRefreshing}
              fullWidth
            >
              {isRefreshing ? 'Reconnecting...' : 'Reconnect RF Sensor'}
            </Button>

            <Button
              size="md"
              variant="secondary"
              icon={<RotateCcw size={16} />}
              onClick={handleRestartScanning}
              fullWidth
            >
              Restart Scanning
            </Button>

            <Button
              size="md"
              variant="danger"
              icon={<AlertCircle size={16} />}
              onClick={handleResetToSafe}
              fullWidth
            >
              Reset to Safe Profile
            </Button>
          </div>
        </Card>

        {/* System Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="text-[13px] text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Health Monitoring</strong> shows real-time status from the Scan Service.
            If telemetry becomes stale (&gt;10s), check the sensor link.
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-4 text-[13px] py-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 font-semibold">{value}</span>
    </div>
  );
}
