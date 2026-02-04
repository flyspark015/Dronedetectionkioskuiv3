import { Maximize, Target, Maximize2, Locate, Plus, Minus } from 'lucide-react';
import { hasValidGPS } from '@/app/utils/gps-helpers';

interface MapToolStackProps {
  onFullscreen: () => void;
  onFocusSelected: () => void;
  onFitMarkers: () => void;
  onCenterMe: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  hasSelectedContact: boolean;
  hasMarkers: boolean;
  isFullscreen?: boolean;
  gpsFixQuality?: number; // GPS fix quality for gating "Center Me"
}

export function MapToolStack({
  onFullscreen,
  onFocusSelected,
  onFitMarkers,
  onCenterMe,
  onZoomIn,
  onZoomOut,
  hasSelectedContact,
  hasMarkers,
  isFullscreen = false,
  gpsFixQuality = 0
}: MapToolStackProps) {
  const buttonClass = "w-14 h-14 bg-slate-900/95 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-2xl flex items-center justify-center border border-slate-700 shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  const canUseGPS = hasValidGPS(gpsFixQuality);

  return (
    <div className={`absolute right-3 flex flex-col gap-2 z-20 ${
      isFullscreen 
        ? 'top-[140px]' // When fullscreen, start below HUD and scan state
        : 'top-1/2 -translate-y-1/2' // Normal mode, centered vertically
    }`}>
      {/* Background plate for contrast */}
      <div className="absolute inset-0 bg-slate-950/40 rounded-3xl blur-2xl -z-10 scale-110" />
      
      {/* Fullscreen Toggle */}
      <button
        onClick={onFullscreen}
        className={buttonClass}
        title="Fullscreen Map"
      >
        <Maximize size={20} />
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-700/50 mx-2 my-1" />

      {/* Focus Selected Contact */}
      <button
        onClick={onFocusSelected}
        className={buttonClass}
        disabled={!hasSelectedContact}
        title="Focus Selected Contact"
      >
        <Target size={20} />
      </button>

      {/* Fit to Markers */}
      <button
        onClick={onFitMarkers}
        className={buttonClass}
        disabled={!hasMarkers}
        title="Fit to All Markers"
      >
        <Maximize2 size={20} />
      </button>

      {/* Center on Me - GPS GATED */}
      <button
        onClick={onCenterMe}
        className={buttonClass}
        disabled={!canUseGPS}
        title={canUseGPS ? "Center on My Location" : "GPS fix required (fix_quality < 2)"}
      >
        <Locate size={20} />
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-700/50 mx-2 my-1" />

      {/* Zoom Controls */}
      <button
        onClick={onZoomIn}
        className={buttonClass}
        title="Zoom In"
      >
        <Plus size={20} />
      </button>

      <button
        onClick={onZoomOut}
        className={buttonClass}
        title="Zoom Out"
      >
        <Minus size={20} />
      </button>
    </div>
  );
}