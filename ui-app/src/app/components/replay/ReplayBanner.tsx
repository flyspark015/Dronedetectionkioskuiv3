import { PlayCircle, X } from 'lucide-react';

interface ReplayBannerProps {
  onExit: () => void;
}

export function ReplayBanner({ onExit }: ReplayBannerProps) {
  return (
    <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <PlayCircle size={18} className="animate-pulse" />
        <span className="text-[14px] font-bold">REPLAY MODE ACTIVE</span>
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[13px] font-semibold transition-colors active:scale-95"
      >
        <X size={16} />
        <span>Exit Replay</span>
      </button>
    </div>
  );
}
