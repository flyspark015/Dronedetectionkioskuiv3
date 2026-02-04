import { Button } from './Button';
import { Card } from './Card';
import { Badge } from './Badge';
import { Bell, BellOff, Volume2, VolumeX, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface Alert {
  id: string;
  contactId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface AlertsScreenProps {
  alerts: Alert[];
  onAckAll: () => void;
  onMute: () => void;
  onMuteFpv: () => void;
  onMuteRemoteId: () => void;
  onMuteDuration: (minutes: number) => void;
  onAlertClick: (alert: Alert) => void;
  isMuted: boolean;
  hasCriticalAlert?: boolean;
}

export function AlertsScreen({
  alerts,
  onAckAll,
  onMute,
  onMuteFpv,
  onMuteRemoteId,
  onMuteDuration,
  onAlertClick,
  isMuted,
  hasCriticalAlert = false
}: AlertsScreenProps) {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const highCount = activeAlerts.filter(a => a.severity === 'high').length;

  // Get last alert time
  const lastAlert = alerts.length > 0 
    ? alerts.reduce((latest, alert) => alert.timestamp > latest.timestamp ? alert : latest)
    : null;

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header Stats - Fixed */}
      <div className="flex-shrink-0 p-4 space-y-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 rounded-xl">
            <TrendingUp size={20} className="text-red-400" />
          </div>
          <div>
            <div className="text-[12px] text-slate-400">Critical</div>
            <div className="text-[20px] font-bold text-slate-100">{criticalCount}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600/20 rounded-xl">
            <Bell size={20} className="text-orange-400" />
          </div>
          <div>
            <div className="text-[12px] text-slate-400">High</div>
            <div className="text-[20px] font-bold text-slate-100">{highCount}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600/20 rounded-xl">
            <CheckCircle size={20} className="text-green-400" />
          </div>
          <div>
            <div className="text-[12px] text-slate-400">Resolved</div>
            <div className="text-[20px] font-bold text-slate-100">{resolvedAlerts.length}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 space-y-3 flex-shrink-0">
        {/* Primary actions */}
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="primary" icon={<Bell size={18} />} onClick={onAckAll}>
            Ack All
          </Button>
          <Button size="sm" variant="secondary" icon={isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />} onClick={onMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
          <Button size="sm" variant="secondary" icon={<BellOff size={18} />} onClick={onMuteFpv}>
            Mute FPV
          </Button>
          <Button size="sm" variant="secondary" icon={<BellOff size={18} />} onClick={onMuteRemoteId}>
            Mute RID
          </Button>
        </div>
        
        {/* Mute duration shortcuts */}
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" onClick={() => onMuteDuration(1)}>
            1m
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onMuteDuration(5)}>
            5m
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onMuteDuration(15)}>
            15m
          </Button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        {/* Last Event Card */}
        {lastAlert && (
          <Card className="!p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600/20 rounded-xl">
                <Clock size={20} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-slate-400 mb-1">Last Alert</div>
                <div className="text-[14px] font-semibold text-slate-100 mb-1">
                  {lastAlert.title}
                </div>
                <div className="text-[12px] text-slate-400">
                  {lastAlert.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <section>
            <h2 className="text-[18px] font-semibold text-slate-100 mb-3">
              Active ({activeAlerts.length})
            </h2>
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onClick={() => onAlertClick(alert)} />
              ))}
            </div>
          </section>
        )}

        {/* Acknowledged Alerts */}
        {acknowledgedAlerts.length > 0 && (
          <section>
            <h2 className="text-[18px] font-semibold text-slate-100 mb-3">
              Acknowledged ({acknowledgedAlerts.length})
            </h2>
            <div className="space-y-3">
              {acknowledgedAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onClick={() => onAlertClick(alert)} />
              ))}
            </div>
          </section>
        )}

        {/* Resolved Alerts */}
        {resolvedAlerts.length > 0 && (
          <section>
            <h2 className="text-[18px] font-semibold text-slate-100 mb-3">
              Resolved ({resolvedAlerts.length})
            </h2>
            <div className="space-y-3">
              {resolvedAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onClick={() => onAlertClick(alert)} />
              ))}
            </div>
          </section>
        )}

        {alerts.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-4">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
            </div>
            <div className="text-[18px] font-semibold text-slate-300 mb-2">
              All Clear
            </div>
            <div className="text-[14px] text-slate-500">
              No active alerts
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, onClick }: { alert: Alert; onClick: () => void }) {
  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Priority stripe color
  const priorityColors = {
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
    info: 'bg-slate-600'
  };

  return (
    <div className="relative">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl ${priorityColors[alert.severity]}`} />
      <Card onClick={onClick} className="ml-1.5">
        <div className="flex items-start gap-3">
          <Badge severity={alert.severity} label={alert.severity} />
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold text-slate-100 mb-1">
              {alert.title}
            </div>
            <div className="text-[14px] text-slate-300 mb-2">
              {alert.message}
            </div>
            <div className="text-[12px] text-slate-400">
              {getRelativeTime(alert.timestamp)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}