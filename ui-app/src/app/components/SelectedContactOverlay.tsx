import { X, Navigation } from 'lucide-react';
import type { Contact } from '@/app/types/contacts';
import { isRemoteIdContact } from '@/app/types/contacts';
import { hasValidGPS } from '@/app/utils/gps-helpers';

interface SelectedContactOverlayProps {
  contact: Contact | null;
  onClear: () => void;
  gpsFixQuality?: number;
}

export function SelectedContactOverlay({ contact, onClear, gpsFixQuality = 0 }: SelectedContactOverlayProps) {
  if (!contact || !isRemoteIdContact(contact)) return null;

  const hasDroneCoords = !!contact.remote_id?.drone_coords &&
    Number.isFinite(Number(contact.remote_id?.drone_coords?.lat)) &&
    Number.isFinite(Number(contact.remote_id?.drone_coords?.lon));

  return (
    <div className="absolute bottom-20 left-3 right-3 md:bottom-3 md:left-[180px] md:right-auto md:min-w-[280px] md:max-w-[320px] bg-slate-900/95 rounded-2xl p-4 border border-slate-700 shadow-lg z-10">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Selected</div>
          {contact.remote_id?.model && (
            <div className="text-[16px] font-semibold text-slate-100 mb-1">
              {contact.remote_id.model}
            </div>
          )}
          {contact.remote_id?.serial_id && (
            <div className="text-[13px] text-slate-300 truncate">
              {contact.remote_id.serial_id}
            </div>
          )}
        </div>
        <button
          onClick={onClear}
          className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 flex-shrink-0"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Distance & Bearing - GPS GATED */}
      {hasValidGPS(gpsFixQuality) && contact.distance_m !== undefined && contact.bearing_deg !== undefined && (
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl">
          <Navigation size={16} className="text-blue-400" />
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[18px] font-bold text-slate-100">{contact.distance_m.toFixed(0)}</span>
              <span className="text-[12px] text-slate-400 ml-1">m</span>
            </div>
            <div className="h-4 w-px bg-slate-600" />
            <div>
              <span className="text-[18px] font-bold text-slate-100">{contact.bearing_deg}</span>
              <span className="text-[12px] text-slate-400">°</span>
            </div>
          </div>
        </div>
      )}

      {/* GPS Required Message */}
      {!hasValidGPS(gpsFixQuality) && contact.distance_m !== undefined && (
        <div className="text-xs text-amber-500 bg-amber-950/30 p-2 rounded-lg">
          GPS fix required for distance/bearing
        </div>
      )}

      {!hasDroneCoords && (
        <div className="mt-2 text-xs text-amber-300 bg-amber-950/30 p-2 rounded-lg">
          Location not broadcast
        </div>
      )}

      {/* Altitude */}
      {contact.remote_id?.drone_coords?.alt_m != null && (
        <div className="mt-2 text-[12px] text-slate-400">
          Altitude: <span className="text-slate-200 font-semibold">{contact.remote_id.drone_coords.alt_m}m</span>
        </div>
      )}
    </div>
  );
}
