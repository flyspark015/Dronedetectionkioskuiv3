import { Play, Pause, Square, SkipBack, SkipForward, Repeat } from 'lucide-react';
import { Button } from '@/app/components/Button';
import { Chip } from '@/app/components/Chip';

interface TransportControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRestart: () => void;
  onStepForward: () => void;
  loopEnabled: boolean;
  onToggleLoop: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

const speedPresets = [0.25, 0.5, 1, 2, 5, 10];

export function TransportControls({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onRestart,
  onStepForward,
  loopEnabled,
  onToggleLoop,
  playbackSpeed,
  onSpeedChange
}: TransportControlsProps) {
  return (
    <div className="space-y-3">
      {/* Main Transport Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          size="sm"
          variant={isPlaying ? 'warning' : 'primary'}
          icon={isPlaying ? <Pause size={18} /> : <Play size={18} />}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          icon={<Square size={18} />}
          onClick={onStop}
        >
          Stop
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          icon={<SkipBack size={18} />}
          onClick={onRestart}
        >
          Restart
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          icon={<SkipForward size={18} />}
          onClick={onStepForward}
        >
          Step
        </Button>
        
        <Button
          size="sm"
          variant={loopEnabled ? 'primary' : 'secondary'}
          icon={<Repeat size={18} />}
          onClick={onToggleLoop}
        >
          Loop
        </Button>
      </div>
      
      {/* Speed Controls */}
      <div>
        <div className="text-[11px] text-slate-400 mb-2 font-medium">Playback Speed</div>
        <div className="flex flex-wrap gap-2 chips-scroll">
          {speedPresets.map(speed => (
            <Chip
              key={speed}
              label={`${speed}×`}
              active={playbackSpeed === speed}
              onClick={() => onSpeedChange(speed)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
