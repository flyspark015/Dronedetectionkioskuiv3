import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Badge } from './Badge';
import { Eye, Target, Pause, Radio, Pin, Tag, MapPin, Download } from 'lucide-react';
import type { Contact } from '@/app/types/contacts';
import { isRemoteIdContact, isFpvLinkContact, isUnknownRfContact, getDisplayFrequencyMHz } from '@/app/types/contacts';
import { sendEsp32Command } from '@/app/services/esp32Commands';

interface ContactDetailsSheetProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onPreviewVideo?: (contactId: string) => void;
}

export function ContactDetailsSheet({ contact, isOpen, onClose, onPreviewVideo }: ContactDetailsSheetProps) {
  const [localHold, setLocalHold] = useState(false);
  const [localMute, setLocalMute] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'actions' | 'history'>('overview');
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    if (!contact || !isOpen) return;
    const timer = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [contact?.id, isOpen]);

  if (!contact) return null;

  const formatAgo = (ageMs: number) => {
    const val = Math.max(0, ageMs);
    if (val < 1000) return `${Math.round(val)} ms ago`;
    const seconds = val / 1000;
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = Math.round(seconds % 60);
      return `${m}m ${s}s ago`;
    }
    return `${seconds.toFixed(1)} s ago`;
  };

  const formatCoords = (coords: { lat: number; lon: number }) => {
    return `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
  };

  const ageMs = Math.max(0, tick - contact.last_seen_ts);
  const isLive = ageMs <= contact.stale_after_ms;
  const liveLabel = isLive ? 'Live' : 'Stale';
  const liveClass = isLive ? 'text-emerald-400' : 'text-amber-400';

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'data' as const, label: 'Data' },
    { id: 'actions' as const, label: 'Actions' },
    { id: 'history' as const, label: 'History' },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Contact Details">
      <div className="px-6 py-4">
        {/* Contact header */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Badge type={contact.type} label={contact.type === 'REMOTE_ID' ? 'Remote ID' : contact.type === 'FPV_LINK' ? 'FPV Video' : 'Unknown'} />
          <Badge severity={contact.severity} label={contact.severity} />
          {contact.isPinned && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-600/20 text-amber-400 text-[11px] font-semibold rounded-lg border border-amber-600/40">
              <Pin size={12} />
              <span>Pinned</span>
            </div>
          )}
          {contact.tags && contact.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg flex items-center gap-1"
            >
              <Tag size={12} />
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {contact.type === 'FPV_LINK' && (
              <>
                <Button size="sm" variant="primary" icon={<Eye size={18} />} onClick={() => onPreviewVideo?.(contact.id)}>
                  Preview Video
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Target size={18} />}
                  onClick={() => sendEsp32Command('FPV_LOCK_STRONGEST', { timeout_s: 2.5 })}
                >
                  Lock
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Pause size={18} />}
                  onClick={() => {
                    const next = !localHold;
                    setLocalHold(next);
                    sendEsp32Command('FPV_HOLD_SET', { hold: next ? 1 : 0, timeout_s: 2.5 });
                  }}
                >
                  Hold
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Radio size={18} />}
                  onClick={() => sendEsp32Command('TEST_BEEP', { timeout_s: 3 })}
                >
                  Tune
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Radio size={18} />}
                  onClick={() => {
                    const next = !localMute;
                    setLocalMute(next);
                    sendEsp32Command('MUTE_SET', { mute: next ? 1 : 0, timeout_s: 2.5 });
                  }}
                >
                  Mute
                </Button>
              </>
            )}
            {contact.type === 'REMOTE_ID' && (
              <>
                <Button size="sm" variant="secondary" icon={<Pin size={18} />}>
                  Pin
                </Button>
                <Button size="sm" variant="secondary" icon={<Tag size={18} />}>
                  Tag
                </Button>
                <Button size="sm" variant="secondary" icon={<MapPin size={18} />}>
                  Focus Map
                </Button>
                <Button size="sm" variant="secondary" icon={<Download size={18} />}>
                  Export
                </Button>
              </>
            )}
            {contact.type === 'UNKNOWN_RF' && (
              <>
                <Button size="sm" variant="secondary" icon={<Pin size={18} />}>
                  Pin
                </Button>
                <Button size="sm" variant="secondary" icon={<Tag size={18} />}>
                  Tag
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[14px] font-medium min-h-[48px] transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {isFpvLinkContact(contact) && (
                <>
                  {contact.fpv_link.band && <InfoRow label="Band" value={contact.fpv_link.band} />}
                  {(() => {
                    const mhz = getDisplayFrequencyMHz(contact.fpv_link.freq_hz);
                    const v = (mhz != null && Number.isFinite(mhz)) ? `${mhz.toFixed(0)} MHz` : '-';
                    return <InfoRow label="Frequency" value={v} />;
                  })()}
                  <InfoRow label="RSSI" value={`${contact.fpv_link.rssi_dbm} dBm`} />
                  <InfoRow label="Lock State" value={contact.fpv_link.lock_state.toUpperCase()} />
                  {contact.fpv_link.threshold && <InfoRow label="Threshold Preset" value={contact.fpv_link.threshold} />}
                  {contact.fpv_link.hit_count !== undefined && <InfoRow label="Hit Count" value={contact.fpv_link.hit_count.toString()} />}
                </>
              )}
              {isRemoteIdContact(contact) && (
                <>
                  {contact.remote_id?.model && <InfoRow label="Model" value={contact.remote_id.model} />}
                  {contact.remote_id?.serial_id && <InfoRow label="Serial ID" value={contact.remote_id.serial_id} />}
                  <InfoRow
                    label="Live Updates"
                    value={<span className={liveClass}>{liveLabel}</span>}
                  />
                  <InfoRow label="Last Update" value={formatAgo(ageMs)} />
                  {contact.remote_id?.drone_coords && (
                    <InfoRow
                      label="Drone Lat/Lon"
                      value={formatCoords(contact.remote_id.drone_coords)}
                    />
                  )}
                  {contact.remote_id?.drone_coords?.alt_m != null && (
                    <InfoRow label="Altitude" value={`${contact.remote_id.drone_coords.alt_m}m`} />
                  )}
                  {contact.remote_id?.pilot_coords && (
                    <InfoRow
                      label="Pilot Lat/Lon"
                      value={formatCoords(contact.remote_id.pilot_coords)}
                    />
                  )}
                  {contact.remote_id?.home_coords && (
                    <InfoRow
                      label="Home Lat/Lon"
                      value={formatCoords(contact.remote_id.home_coords)}
                    />
                  )}
                  {contact.distance_m != null && <InfoRow label="Distance" value={`${contact.distance_m.toFixed(0)}m`} />}
                  {contact.bearing_deg !== undefined && <InfoRow label="Bearing" value={`${contact.bearing_deg}°`} />}
                </>
              )}
              {isUnknownRfContact(contact) && (
                <>
                  {contact.unknown_rf?.signal_strength && <InfoRow label="Signal Strength" value={`${contact.unknown_rf.signal_strength}%`} />}
                  {contact.unknown_rf?.notes && <InfoRow label="Notes" value={contact.unknown_rf.notes} />}
                </>
              )}
              <InfoRow label="Last Seen" value={new Date(contact.last_seen_ts).toLocaleString()} />
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-slate-950 rounded-2xl p-4 overflow-x-auto">
              <pre className="text-[12px] text-slate-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(contact, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              <div className="text-[14px] text-slate-400">
                Additional actions can be configured here.
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="text-[12px] text-slate-400 mb-1">2 minutes ago</div>
                <div className="text-[14px] text-slate-200">Contact detected</div>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="text-[12px] text-slate-400 mb-1">5 minutes ago</div>
                <div className="text-[14px] text-slate-200">Signal strength increased</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-800 last:border-0">
      <span className="text-[14px] text-slate-400 font-medium">{label}</span>
      <span className="text-[14px] text-slate-100 text-right">{value}</span>
    </div>
  );
}
