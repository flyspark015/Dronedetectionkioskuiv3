import { Navigation } from 'lucide-react';

interface CompassControlProps {
  heading: number;
  onResetNorth: () => void;
}

export function CompassControl({ heading, onResetNorth }: CompassControlProps) {
  const isNorthUp = heading === 0;

  return (
    <button
      onClick={onResetNorth}
      className="bg-slate-900/95 hover:bg-slate-800 active:bg-slate-700 rounded-2xl p-3 border border-slate-700 shadow-lg transition-colors min-h-[56px] min-w-[56px] flex flex-col items-center justify-center"
      title={isNorthUp ? "North Up" : "Reset to North"}
    >
      <div className="relative w-8 h-8 flex items-center justify-center">
        <Navigation
          size={24}
          className={`transition-all ${isNorthUp ? 'text-slate-400' : 'text-blue-400'}`}
          style={{
            transform: `rotate(${heading}deg)`
          }}
        />
      </div>
      {!isNorthUp && (
        <div className="text-[10px] text-slate-400 font-semibold mt-1">
          {heading}°
        </div>
      )}
    </button>
  );
}
