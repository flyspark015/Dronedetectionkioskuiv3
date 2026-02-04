import { useState } from 'react';
import { Volume2, VolumeX, Check, StopCircle, Target, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface PanicControlsProps {
  mode: 'home' | 'alerts' | 'minimal';
  isMuted: boolean;
  onToggleMute: () => void;
  onAck: () => void;
  onStopScan: () => void;
  onLockStrongest: () => void;
  isCollapsed?: boolean;
}

export function PanicControls({
  mode,
  isMuted,
  onToggleMute,
  onAck,
  onStopScan,
  onLockStrongest,
  isCollapsed = false
}: PanicControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Minimal mode - just a panic pill button
  if (mode === 'minimal') {
    return (
      <>
        {!isExpanded && (
          <div className="fixed left-0 right-0 z-30 px-4" style={{ bottom: 'var(--panic-bottom-offset)' }}>
            <div className="flex justify-center">
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full font-semibold min-h-[56px] shadow-lg active:scale-95 transition-transform"
              >
                <AlertCircle size={20} />
                <span>Panic</span>
              </button>
            </div>
          </div>
        )}
        
        {isExpanded && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 flex items-end" 
            style={{ paddingBottom: 'var(--tab-bar-height)' }}
            onClick={() => setIsExpanded(false)}
          >
            <div className="w-full bg-slate-900 rounded-t-3xl p-6 pb-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Panic Controls</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => { onToggleMute(); setIsExpanded(false); }}
                  icon={isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  fullWidth
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { onAck(); setIsExpanded(false); }}
                  icon={<Check size={20} />}
                  fullWidth
                >
                  Acknowledge
                </Button>
                <Button
                  variant="warning"
                  size="md"
                  onClick={() => { onLockStrongest(); setIsExpanded(false); }}
                  icon={<Target size={20} />}
                  fullWidth
                >
                  Lock Strongest
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => { onStopScan(); setIsExpanded(false); }}
                  icon={<StopCircle size={20} />}
                  fullWidth
                >
                  Stop Scan
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Alerts mode - only Stop Scan button
  if (mode === 'alerts') {
    return (
      <div className={`fixed left-0 right-0 z-30 px-4 transition-opacity ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ bottom: 'var(--panic-bottom-offset)' }}>
        <div className="flex justify-center">
          <Button
            variant="danger"
            size="md"
            onClick={onStopScan}
            icon={<StopCircle size={20} />}
          >
            Stop Scan
          </Button>
        </div>
      </div>
    );
  }

  // Home mode - full controls with collapse support
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 z-30 px-4 transition-opacity" style={{ bottom: 'var(--panic-bottom-offset)' }}>
      <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
        <Button
          variant="primary"
          size="md"
          onClick={onToggleMute}
          icon={isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={onAck}
          icon={<Check size={20} />}
        >
          Ack
        </Button>
        <Button
          variant="warning"
          size="md"
          onClick={onLockStrongest}
          icon={<Target size={20} />}
        >
          Lock Strongest
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={onStopScan}
          icon={<StopCircle size={20} />}
        >
          Stop Scan
        </Button>
      </div>
    </div>
  );
}