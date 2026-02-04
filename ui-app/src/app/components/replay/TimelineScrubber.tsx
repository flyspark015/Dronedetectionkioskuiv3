import { useRef, useState, useEffect } from 'react';
import { AlertCircle, MapPin, User } from 'lucide-react';

interface TimelineMarker {
  type: 'alert' | 'location' | 'id-change' | 'error';
  timestamp: number;
  label?: string;
}

interface TimelineScrubberProps {
  currentTime: number; // in seconds
  duration: number; // in seconds
  onSeek: (time: number) => void;
  markers?: TimelineMarker[];
  fileStartTime?: Date;
}

export function TimelineScrubber({
  currentTime,
  duration,
  onSeek,
  markers = [],
  fileStartTime
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = (percent / 100) * duration;
    
    onSeek(newTime);
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeek(e);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSeek(e);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);
  
  const getMarkerIcon = (type: TimelineMarker['type']) => {
    switch (type) {
      case 'alert': return <AlertCircle size={10} />;
      case 'location': return <MapPin size={10} />;
      case 'id-change': return <User size={10} />;
      case 'error': return <div className="w-1.5 h-1.5 rounded-full bg-red-500" />;
      default: return null;
    }
  };
  
  const getMarkerColor = (type: TimelineMarker['type']) => {
    switch (type) {
      case 'alert': return 'text-red-400';
      case 'location': return 'text-blue-400';
      case 'id-change': return 'text-purple-400';
      case 'error': return 'text-red-600';
      default: return 'text-slate-400';
    }
  };
  
  return (
    <div className="space-y-2">
      {/* Time Display */}
      <div className="flex justify-between items-center text-[11px]">
        <div className="text-slate-300 font-mono">
          <span className="text-slate-100 font-semibold">{formatTime(currentTime)}</span>
          <span className="text-slate-500"> / {formatTime(duration)}</span>
        </div>
        {fileStartTime && (
          <div className="text-slate-400">
            File: {fileStartTime.toLocaleTimeString()}
          </div>
        )}
        <div className="text-slate-400">
          Now: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {/* Timeline Track */}
      <div className="relative">
        <div
          ref={trackRef}
          className="relative h-10 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          {/* Progress Fill */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-600/30 rounded-xl transition-all"
            style={{ width: `${progress}%` }}
          />
          
          {/* Markers */}
          {markers.map((marker, idx) => {
            const markerPos = (marker.timestamp / duration) * 100;
            return (
              <div
                key={idx}
                className={`absolute top-1/2 -translate-y-1/2 ${getMarkerColor(marker.type)}`}
                style={{ left: `${markerPos}%` }}
                title={marker.label}
              >
                {getMarkerIcon(marker.type)}
              </div>
            );
          })}
          
          {/* Playhead */}
          <div
            className="absolute top-0 w-1 h-full bg-blue-400 shadow-lg transition-all"
            style={{ left: `${progress}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full border-2 border-slate-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
