import { Contact } from '@/app/types/contacts';
import { 
  isRemoteIdContact, 
  isFpvLinkContact, 
  isUnknownRfContact,
  getDisplayFrequencyMHz,
  getTimeSinceLastSeen,
  isContactStale,
  isContactLost
} from '@/app/types/contacts';
import { hasValidGPS } from '@/app/utils/gps-helpers';
import { Lock, MapPin, Radio, Tag, AlertCircle } from 'lucide-react';

/**
 * Touch-Optimized Contact Card — CONTRACT ALIGNED
 * 
 * Design Principles:
 * - Entire card is tappable (minimum 80px height)
 * - Large, clear typography (14-16px minimum)
 * - Color-coded severity stripe (4px left border)
 * - Icons always paired with labels
 * 
 * Touch Behavior:
 * - Tap anywhere → Open details
 */

export interface TouchContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
  isSelected?: boolean;
  isNearest?: boolean;
  gpsFixQuality?: number; // GPS fix quality for gating distance/bearing display
}

export function TouchContactCard({ contact, onClick, isSelected = false, isNearest = false, gpsFixQuality = 0 }: TouchContactCardProps) {
  const isStale = isContactStale(contact);
  const isLost = isContactLost(contact);

  // Severity colors
  const severityColors = {
    critical: 'bg-critical',
    high: 'bg-high',
    medium: 'bg-medium',
    low: 'bg-low',
    info: 'bg-slate-500',
  };

  // Type icons and colors
  const typeConfig = {
    'REMOTE_ID': {
      icon: <MapPin className="w-5 h-5" />,
      color: 'text-remote-id',
      label: 'Remote ID',
    },
    'FPV_LINK': {
      icon: <Radio className="w-5 h-5" />,
      color: 'text-fpv',
      label: 'FPV Link',
    },
    'UNKNOWN_RF': {
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-unknown',
      label: 'Unknown',
    },
  };

  const config = typeConfig[contact.type];

  // Get display name
  const getDisplayName = () => {
    if (isRemoteIdContact(contact)) {
      return contact.remote_id?.model || contact.remote_id?.serial_id || 'Remote ID';
    }
    if (isFpvLinkContact(contact)) {
      const mhz = getDisplayFrequencyMHz(contact.fpv_link.freq_hz);
      return (mhz != null && Number.isFinite(mhz)) ? `${mhz.toFixed(0)} MHz` : '-';
    }
    return config.label;
  };

  // Get subtitle
  const getSubtitle = () => {
    if (isRemoteIdContact(contact)) {
      return contact.remote_id?.serial_id;
    }
    if (isFpvLinkContact(contact)) {
      return contact.fpv_link.band;
    }
    return undefined;
  };

  return (
    <button
      onClick={() => onClick(contact)}
      className={`
        w-full min-h-[80px] p-4
        flex items-start gap-3
        bg-slate-800 hover:bg-slate-750 active:bg-slate-700
        rounded-[16px]
        border-l-4 ${contact.severity ? severityColors[contact.severity] : 'bg-slate-500'}
        transition-all duration-100
        text-left
        touch-target press-feedback ripple-container
        ${isSelected ? 'ring-2 ring-slate-100 ring-offset-2 ring-offset-slate-900' : ''}
        ${isLost ? 'opacity-60' : ''}
      `}
    >
      {/* Left: Type icon */}
      <div className={`flex-shrink-0 ${config.color} mt-1`}>
        {config.icon}
      </div>

      {/* Middle: Main content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-100 truncate">
              {getDisplayName()}
            </h3>
            {getSubtitle() && (
              <p className="text-sm text-slate-400 truncate">{getSubtitle()}</p>
            )}
          </div>

          {/* Status badges */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {contact.isPinned && (
              <div className="w-6 h-6 rounded-md bg-warning-bg text-warning flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
            )}
            {contact.source === 'replay' && (
              <div className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/30 text-amber-500">
                REPLAY
              </div>
            )}
            {isStale && !isLost && (
              <div className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/30 text-amber-500">
                STALE
              </div>
            )}
            {isLost && (
              <div className="px-2 py-0.5 rounded text-xs font-semibold bg-red-950/30 text-red-500">
                LOST
              </div>
            )}
            {isNearest && isRemoteIdContact(contact) && (
              <div className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950/30 text-blue-400">
                NEAREST
              </div>
            )}
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 text-sm text-slate-300">
          {isRemoteIdContact(contact) && hasValidGPS(gpsFixQuality) && contact.distance_m !== undefined && (
            <span className="flex items-center gap-1">
              <span className="font-medium">{contact.distance_m}m</span>
              {contact.bearing_deg !== undefined && (
                <span className="text-slate-500">• {contact.bearing_deg}°</span>
              )}
            </span>
          )}
          {isFpvLinkContact(contact) && (
            <span className="flex items-center gap-1">
              <span className="font-medium">{contact.fpv_link.rssi_dbm} dBm</span>
              <span className="text-slate-500">• {contact.fpv_link.lock_state}</span>
            </span>
          )}
          <span className="text-slate-500 ml-auto">
            {getTimeSinceLastSeen(contact.last_seen_ts)}
          </span>
        </div>
      </div>
    </button>
  );
}
