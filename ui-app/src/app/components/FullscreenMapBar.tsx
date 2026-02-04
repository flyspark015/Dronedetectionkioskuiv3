import { Minimize, ChevronDown } from 'lucide-react';

interface FullscreenMapBarProps {
  contactCount: number;
  onExit: () => void;
  onPullUp: () => void;
}

export function FullscreenMapBar({ contactCount, onExit, onPullUp }: FullscreenMapBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 shadow-2xl flex items-center justify-between px-4 py-3 z-30">
      <button
        onClick={onPullUp}
        className="flex items-center gap-2 flex-1 text-left hover:bg-slate-800 active:bg-slate-700 rounded-2xl px-4 py-3 transition-colors min-h-[56px]"
      >
        <ChevronDown size={20} className="text-slate-400 rotate-180" />
        <div>
          <span className="text-[14px] font-semibold text-slate-100">
            Contacts ({contactCount})
          </span>
          <span className="text-[12px] text-slate-400 ml-2">• Pull up</span>
        </div>
      </button>

      <button
        onClick={onExit}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-2xl font-semibold text-[14px] transition-colors min-h-[56px] ml-3"
      >
        <Minimize size={18} />
        Exit Fullscreen
      </button>
    </div>
  );
}
