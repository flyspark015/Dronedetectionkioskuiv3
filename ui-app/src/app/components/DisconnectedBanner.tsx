/**
 * Disconnected Banner — Shows when WebSocket is disconnected
 * 
 * Displays stale data warning and reconnection status
 */

import { WifiOff, RefreshCw } from 'lucide-react';

export interface DisconnectedBannerProps {
  isDisconnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  lastDisconnectTime: number | null;
  onManualReconnect: () => void;
}

export function DisconnectedBanner({ 
  isDisconnected, 
  isReconnecting, 
  reconnectAttempt,
  lastDisconnectTime,
  onManualReconnect 
}: DisconnectedBannerProps) {
  if (!isDisconnected) return null;

  // Calculate time since disconnect
  const timeSinceDisconnect = lastDisconnectTime 
    ? Math.floor((Date.now() - lastDisconnectTime) / 1000)
    : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="fixed top-[52px] left-0 right-0 z-40 bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
      {/* Left: Icon + Text */}
      <div className="flex items-center gap-2">
        <WifiOff size={20} className="flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-sm font-bold uppercase tracking-wide">
            {isReconnecting ? 'RECONNECTING' : 'DISCONNECTED'}
          </span>
          <span className="text-xs opacity-90">
            {isReconnecting 
              ? `Attempt ${reconnectAttempt}` 
              : `Offline for ${formatTime(timeSinceDisconnect)}`
            }
          </span>
        </div>
      </div>

      {/* Right: Reconnect Button */}
      <button
        onClick={onManualReconnect}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
        disabled={isReconnecting}
      >
        <RefreshCw size={16} className={isReconnecting ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">
          {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
        </span>
      </button>
    </div>
  );
}
