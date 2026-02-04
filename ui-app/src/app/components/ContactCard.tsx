import { Badge } from './Badge';
import { Card } from './Card';
import { Pin, Navigation } from 'lucide-react';
import type { Contact, RemoteIdContact, FpvLinkContact, UnknownRfContact } from '@/app/types/contacts';
import { isRemoteIdContact, isFpvLinkContact, isUnknownRfContact, getDisplayFrequencyMHz } from '@/app/types/contacts';

interface ContactCardProps {
  contact: Contact;
  onClick: () => void;
  isNearest?: boolean;
}

export function ContactCard({ contact, onClick, isNearest = false }: ContactCardProps) {
  const getRelativeTime = (timestampMs: number) => {
    const seconds = Math.floor((Date.now() - timestampMs) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getAgeSeconds = (timestampMs: number) => {
    return Math.floor((Date.now() - timestampMs) / 1000);
  };

  const ageSeconds = getAgeSeconds(contact.last_seen_ts);
  const isStale = ageSeconds > 15 && ageSeconds <= 60;
  const isLost = ageSeconds > 60;

  // Priority stripe color
  const priorityColors = {
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
    info: 'bg-slate-600'
  };

  const severity = contact.severity || 'info'; // Default to 'info' if undefined

  // Count hidden badges (pinned + tags)
  let extraBadgeCount = 0;
  if (contact.isPinned) extraBadgeCount++;
  if (contact.tags && contact.tags.length > 0) extraBadgeCount += contact.tags.length;

  return (
    <div className="relative">
      {/* Left priority stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl ${priorityColors[severity]}`} />
      
      <Card onClick={onClick} className="ml-1.5">
        <div className="flex flex-col gap-3">
          {/* Header row - max 3 visible badges + extra count */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge 1: Type */}
              <Badge type={contact.type} label={contact.type === 'REMOTE_ID' ? 'Remote ID' : contact.type === 'FPV_LINK' ? 'FPV Video' : 'Unknown'} />
              
              {/* Badge 2: Severity */}
              <Badge severity={severity} label={severity} />
              
              {/* Badge 3: State (STALE/LOST/NEAREST) */}
              {isNearest && isRemoteIdContact(contact) ? (
                <span className="px-2 py-1 bg-blue-600 text-white text-[11px] font-bold uppercase rounded-lg">
                  Nearest
                </span>
              ) : isLost ? (
                <span className="px-2 py-1 bg-red-600/30 text-red-400 text-[11px] font-semibold uppercase rounded-lg border border-red-600/50">
                  Lost
                </span>
              ) : isStale ? (
                <span className="px-2 py-1 bg-amber-600/30 text-amber-400 text-[11px] font-semibold uppercase rounded-lg border border-amber-600/50">
                  Stale
                </span>
              ) : null}

              {/* Extra badge count */}
              {extraBadgeCount > 0 && (
                <span className="px-2 py-1 bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg border border-slate-600">
                  +{extraBadgeCount}
                </span>
              )}
            </div>
            <span className="text-[12px] text-slate-400 whitespace-nowrap">
              {getRelativeTime(contact.last_seen_ts)}
            </span>
          </div>

          {/* Type-specific content */}
          {isRemoteIdContact(contact) && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {/* Placeholder drone icon */}
                <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-600/40">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="5" cy="5" r="2" />
                    <circle cx="19" cy="5" r="2" />
                    <circle cx="5" cy="19" r="2" />
                    <circle cx="19" cy="19" r="2" />
                    <line x1="12" y1="9" x2="12" y2="5" />
                    <line x1="12" y1="15" x2="12" y2="19" />
                    <line x1="9" y1="12" x2="5" y2="12" />
                    <line x1="15" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {contact.remote_id?.model && (
                    <div className="text-[16px] font-semibold text-slate-100">
                      {contact.remote_id.model}
                    </div>
                  )}
                  {contact.remote_id?.serial_id && (
                    <div className="text-[14px] text-slate-300 truncate">
                      {contact.remote_id.serial_id}
                    </div>
                  )}
                </div>
              </div>
              {contact.distance_m !== undefined && contact.bearing_deg !== undefined && (
                <div className="flex items-center gap-2 text-[14px] text-slate-400">
                  <Navigation size={14} />
                  <span>{contact.distance_m.toFixed(0)}m · {contact.bearing_deg}°</span>
                </div>
              )}
            </div>
          )}

          {isFpvLinkContact(contact) && (
            <div className="space-y-1">
              <div className="text-[16px] font-semibold text-slate-100">
                {contact.fpv_link.band} · {getDisplayFrequencyMHz(contact.fpv_link.freq_hz)} MHz
              </div>
              <div className="flex items-center gap-4 text-[14px]">
                <span className="text-slate-300">RSSI: {contact.fpv_link.rssi_dbm} dBm</span>
                <span className={`font-medium ${
                  contact.fpv_link.lock_state === 'locked' ? 'text-amber-400' :
                  contact.fpv_link.lock_state === 'hold' ? 'text-blue-400' :
                  'text-slate-400'
                }`}>
                  {contact.fpv_link.lock_state.toUpperCase()}
                </span>
              </div>
              {contact.fpv_link.hit_count !== undefined && (
                <div className="text-[12px] text-slate-400">
                  Hits: {contact.fpv_link.hit_count}
                </div>
              )}
            </div>
          )}

          {isUnknownRfContact(contact) && (
            <div className="space-y-1">
              <div className="text-[16px] font-semibold text-slate-100">
                Unknown Contact
              </div>
              {contact.unknown_rf?.signal_strength && (
                <div className="text-[14px] text-slate-400">
                  Signal: {contact.unknown_rf.signal_strength}%
                </div>
              )}
              {contact.unknown_rf?.notes && (
                <div className="text-[14px] text-slate-300">
                  {contact.unknown_rf.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
