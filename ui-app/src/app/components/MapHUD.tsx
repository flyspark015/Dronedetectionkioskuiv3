import { MapPin, Clock, Crosshair } from 'lucide-react';

interface MapHUDProps {
  ridMarkersCount: number;
  telemetryAge: number;
  gpsAccuracy: number;
}

export function MapHUD({ ridMarkersCount, telemetryAge, gpsAccuracy }: MapHUDProps) {
  return (
    <div className="absolute top-3 left-3 bg-slate-900/95 rounded-2xl p-3 border border-slate-700 shadow-lg min-w-[140px]">
      <div className="space-y-2">
        {/* RID Markers Count */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-purple-400" />
            <span className="text-[11px] text-slate-400">RID</span>
          </div>
          <span className="text-[14px] font-bold text-slate-100">{ridMarkersCount}</span>
        </div>

        {/* Telemetry Age */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-blue-400" />
            <span className="text-[11px] text-slate-400">Telem</span>
          </div>
          <span className={`text-[14px] font-semibold ${
            telemetryAge < 5 ? 'text-green-400' : 
            telemetryAge < 15 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            {telemetryAge}s
          </span>
        </div>

        {/* GPS Accuracy */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crosshair size={14} className="text-green-400" />
            <span className="text-[11px] text-slate-400">HDOP</span>
          </div>
          <span className={`text-[14px] font-semibold ${
            gpsAccuracy < 2 ? 'text-green-400' : 
            gpsAccuracy < 5 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            {gpsAccuracy.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
