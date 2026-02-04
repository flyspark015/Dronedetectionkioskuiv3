import { useState } from 'react';
import { X, Maximize2, Minimize2, Maximize } from 'lucide-react';
import { Button } from './Button';

interface VideoPreviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
}

export function VideoPreviewOverlay({ isOpen, onClose, contactId }: VideoPreviewOverlayProps) {
  const [activeChannel, setActiveChannel] = useState<1 | 2 | 3>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [isSwitching, setIsSwitching] = useState(false);

  if (!isOpen) return null;

  const handleChannelSwitch = (channel: 1 | 2 | 3) => {
    setIsSwitching(true);
    setTimeout(() => {
      setActiveChannel(channel);
      setIsSwitching(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Controls */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[48px]"
        >
          <X size={24} className="text-slate-100" />
          <span className="text-[16px] font-medium text-slate-100">Back</span>
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFitMode(fitMode === 'fit' ? 'fill' : 'fit')}
            className="p-3 rounded-2xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[48px] min-w-[48px]"
            title={fitMode === 'fit' ? 'Fill' : 'Fit'}
          >
            <Maximize size={24} className="text-slate-100" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-3 rounded-2xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[48px] min-w-[48px]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={24} className="text-slate-100" /> : <Maximize2 size={24} className="text-slate-100" />}
          </button>
        </div>
      </div>

      {/* Video Display */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {isSwitching ? (
          <div className="text-center">
            <div className="text-[20px] font-semibold text-slate-400 animate-pulse">
              Switching to CH{activeChannel}...
            </div>
          </div>
        ) : (
          <div className={`bg-slate-900 ${fitMode === 'fit' ? 'max-w-full max-h-full' : 'w-full h-full'} flex items-center justify-center`}>
            <div className="text-center p-12">
              <div className="text-[24px] font-bold text-slate-300 mb-2">
                FPV Video Feed
              </div>
              <div className="text-[18px] text-slate-400 mb-4">
                Channel {activeChannel}
              </div>
              <div className="text-[14px] text-slate-500">
                Contact ID: {contactId}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Channel Selection */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex gap-3 justify-center max-w-2xl mx-auto">
          <Button
            variant={activeChannel === 1 ? 'primary' : 'secondary'}
            size="lg"
            onClick={() => handleChannelSwitch(1)}
            fullWidth
          >
            CH 1
          </Button>
          <Button
            variant={activeChannel === 2 ? 'primary' : 'secondary'}
            size="lg"
            onClick={() => handleChannelSwitch(2)}
            fullWidth
          >
            CH 2
          </Button>
          <Button
            variant={activeChannel === 3 ? 'primary' : 'secondary'}
            size="lg"
            onClick={() => handleChannelSwitch(3)}
            fullWidth
          >
            CH 3
          </Button>
        </div>
      </div>
    </div>
  );
}