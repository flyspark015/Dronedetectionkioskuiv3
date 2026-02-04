/**
 * Global REPLAY Banner — CONTRACT ALIGNED
 * 
 * Shows when replay is active to prevent confusion between live and replay data
 * 
 * CRITICAL: This is a "must-not-lie" component
 * - Always shows when replay is active
 * - Includes filename if available
 * - Provides Exit Replay button
 */

import { PlayCircle, X } from 'lucide-react';

export interface ReplayBannerProps {
  isReplayActive: boolean;
  filename?: string;
  onExitReplay: () => void;
}

export function ReplayBanner({ isReplayActive, filename, onExitReplay }: ReplayBannerProps) {
  if (!isReplayActive) return null;

  return (
    <div className="fixed top-[52px] left-0 right-0 z-40 bg-amber-600 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
      {/* Left: Icon + Text */}
      <div className="flex items-center gap-2">
        <PlayCircle size={20} className="flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-sm font-bold uppercase tracking-wide">
            REPLAY ACTIVE
          </span>
          {filename && (
            <span className="text-xs font-medium opacity-90 truncate max-w-[200px] sm:max-w-none">
              {filename}
            </span>
          )}
        </div>
      </div>

      {/* Right: Exit Button */}
      <button
        onClick={onExitReplay}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/20 hover:bg-amber-950/30 active:bg-amber-950/40 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
      >
        <X size={16} />
        <span className="hidden sm:inline">Exit Replay</span>
      </button>
    </div>
  );
}
