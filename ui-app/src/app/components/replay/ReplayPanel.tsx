import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Bookmark, Copy, AlertCircle, Clock, Activity } from 'lucide-react';
import { Card } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { TransportControls } from './TransportControls';
import { TimelineScrubber } from './TimelineScrubber';
import { ReplayFilePicker } from './ReplayFilePicker';
import { ReplayFilters } from './ReplayFilters';

interface ReplayPanelProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function ReplayPanel({ isExpanded, onToggleExpanded }: ReplayPanelProps) {
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showRaw, setShowRaw] = useState(true);
  const [showDecoded, setShowDecoded] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [activeTypes, setActiveTypes] = useState<string[]>(['basic-id', 'location', 'system']);
  const [onlyDecoded, setOnlyDecoded] = useState(false);
  
  // Advanced options
  const [usePcapTiming, setUsePcapTiming] = useState(true);
  const [strictTTL, setStrictTTL] = useState(true);
  
  const duration = selectedFile ? 3600 : 0; // 1 hour mock duration
  
  const handleFileSelect = (file: any) => {
    setSelectedFile(file);
    setCurrentTime(0);
    setIsPlaying(false);
  };
  
  const handlePlay = () => {
    if (!selectedFile) return;
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  const handleRestart = () => {
    setCurrentTime(0);
  };
  
  const handleStepForward = () => {
    // Step to next event
    setCurrentTime(prev => Math.min(prev + 1, duration));
  };
  
  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };
  
  const handleToggleType = (type: string) => {
    setActiveTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  const handleJumpToNextAlert = () => {
    // Find next alert marker after current time
    const nextAlert = markers.find(m => m.type === 'alert' && m.timestamp > currentTime);
    if (nextAlert) {
      setCurrentTime(nextAlert.timestamp);
    }
  };
  
  // Mock timeline markers
  const markers = selectedFile ? [
    { type: 'alert' as const, timestamp: 300, label: 'Critical Alert' },
    { type: 'alert' as const, timestamp: 1200, label: 'Warning Alert' },
    { type: 'location' as const, timestamp: 600, label: 'Operator Moved' },
    { type: 'id-change' as const, timestamp: 900, label: 'ID Changed' },
    { type: 'error' as const, timestamp: 1500, label: 'Decode Error' },
  ] : [];
  
  return (
    <Card className="!p-4">
      {/* Header */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="text-[16px] font-semibold text-slate-100">Replay Controls</h3>
        {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>
      
      {isExpanded && (
        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <div className="text-[11px] text-slate-400 mb-2 font-medium">Source File</div>
            <ReplayFilePicker
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onBrowse={() => console.log('Browse files')}
            />
          </div>
          
          {selectedFile && (
            <>
              {/* Transport Controls */}
              <div>
                <div className="text-[11px] text-slate-400 mb-2 font-medium">Playback</div>
                <TransportControls
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStop={handleStop}
                  onRestart={handleRestart}
                  onStepForward={handleStepForward}
                  loopEnabled={loopEnabled}
                  onToggleLoop={() => setLoopEnabled(!loopEnabled)}
                  playbackSpeed={playbackSpeed}
                  onSpeedChange={setPlaybackSpeed}
                />
              </div>
              
              {/* Timeline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] text-slate-400 font-medium">Timeline</div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<AlertCircle size={14} />}
                    onClick={handleJumpToNextAlert}
                    className="!py-1 !px-2 !min-h-[32px]"
                  >
                    Next Alert
                  </Button>
                </div>
                <TimelineScrubber
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                  markers={markers}
                  fileStartTime={selectedFile.startTime}
                />
              </div>
              
              {/* Filters */}
              <div>
                <div className="text-[11px] text-slate-400 mb-2 font-medium">Filters</div>
                <ReplayFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  showRaw={showRaw}
                  showDecoded={showDecoded}
                  showErrors={showErrors}
                  showStats={showStats}
                  onToggleRaw={() => setShowRaw(!showRaw)}
                  onToggleDecoded={() => setShowDecoded(!showDecoded)}
                  onToggleErrors={() => setShowErrors(!showErrors)}
                  onToggleStats={() => setShowStats(!showStats)}
                  activeTypes={activeTypes}
                  onToggleType={handleToggleType}
                  onlyDecoded={onlyDecoded}
                  onToggleOnlyDecoded={() => setOnlyDecoded(!onlyDecoded)}
                />
              </div>
              
              {/* Export & Forensics */}
              <div>
                <div className="text-[11px] text-slate-400 mb-2 font-medium">Export & Forensics</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Download size={16} />}
                    onClick={() => console.log('Export JSONL')}
                  >
                    Export JSONL
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Download size={16} />}
                    onClick={() => console.log('Export CSV')}
                  >
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Bookmark size={16} />}
                    onClick={() => console.log('Bookmark')}
                  >
                    Bookmark
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Copy size={16} />}
                    onClick={() => console.log('Copy object')}
                  >
                    Copy Current
                  </Button>
                </div>
              </div>
              
              {/* Telemetry Panel */}
              <div className="bg-slate-850 border border-slate-700 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={14} className="text-blue-400" />
                  <div className="text-[11px] text-slate-400 font-medium">Decode Health</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <div className="text-[10px] text-slate-500">Frames/sec</div>
                      <div className="text-[14px] font-semibold text-blue-400">
                        {(currentTime > 0 ? Math.random() * 50 + 20 : 0).toFixed(1)}
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <div className="text-[10px] text-slate-500">Decode success</div>
                      <div className="text-[14px] font-semibold text-green-400">
                        {(currentTime > 0 ? 95 + Math.random() * 4 : 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <div className="text-[10px] text-slate-500">Dropped frames</div>
                      <div className="text-[14px] font-semibold text-red-400">
                        {(currentTime > 0 ? Math.floor(Math.random() * 5) : 0)}
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <div className="text-[10px] text-slate-500">Last error</div>
                      <div className="text-[10px] font-medium text-amber-400 truncate">
                        {currentTime > 0 ? 'CRC fail' : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Advanced Options */}
              <div className="bg-slate-850 border border-slate-700 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-amber-400" />
                  <div className="text-[11px] text-slate-400 font-medium">Advanced Options</div>
                </div>
                <div className="space-y-2.5">
                  {/* Deterministic Replay */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex-1">
                      <div className="text-[12px] text-slate-300 group-hover:text-slate-100 transition-colors">
                        Use original PCAP timing
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Replays with exact packet intervals
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={usePcapTiming}
                      onChange={(e) => setUsePcapTiming(e.target.checked)}
                      className="w-5 h-5 bg-slate-700 border-2 border-slate-600 rounded accent-blue-600"
                    />
                  </label>
                  
                  {/* TTL Behavior */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex-1">
                      <div className="text-[12px] text-slate-300 group-hover:text-slate-100 transition-colors">
                        Strict contact TTL
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Remove contacts after timeout
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={strictTTL}
                      onChange={(e) => setStrictTTL(e.target.checked)}
                      className="w-5 h-5 bg-slate-700 border-2 border-slate-600 rounded accent-blue-600"
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}