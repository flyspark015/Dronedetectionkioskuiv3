import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { Chip } from './Chip';
import { Card } from './Card';
import { Download, Tag as TagIcon, AlertCircle, AlertTriangle, Info, MonitorPlay } from 'lucide-react';
import { ReplayPanel } from './replay/ReplayPanel';

interface Log {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  tags?: string[];
  isReplay?: boolean;
}

interface LogsScreenProps {
  logs: Log[];
  onExportCsv: () => void;
  onExportJson: () => void;
  hasCriticalAlert?: boolean;
  isReplayMode?: boolean;
  onToggleReplay?: (enabled: boolean) => void;
}

export function LogsScreen({ 
  logs, 
  onExportCsv, 
  onExportJson, 
  hasCriticalAlert = false,
  isReplayMode = false,
  onToggleReplay
}: LogsScreenProps) {
  const [timeRange, setTimeRange] = useState('1h');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showTaggedOnly, setShowTaggedOnly] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isReplayPanelExpanded, setIsReplayPanelExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const timeRanges = [
    { id: '15m', label: '15m' },
    { id: '1h', label: '1h' },
    { id: '6h', label: '6h' },
    { id: '24h', label: '24h' },
    { id: 'all', label: 'All' },
  ];

  const levelFilters = [
    { id: 'all', label: 'All' },
    { id: 'info', label: 'Info' },
    { id: 'warn', label: 'Warn' },
    { id: 'error', label: 'Error' },
  ];

  // Auto-scroll to bottom when new logs arrive and auto-scroll is enabled
  useEffect(() => {
    if (!isReplayMode && autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isReplayMode, autoScroll]);

  const filteredLogs = logs.filter(log => {
    // Filter by level
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    
    // Filter by tagged
    if (showTaggedOnly && (!log.tags || log.tags.length === 0)) return false;
    
    // Filter by time range
    const now = Date.now();
    const logTime = log.timestamp.getTime();
    const diff = now - logTime;
    
    if (timeRange === '15m' && diff > 15 * 60 * 1000) return false;
    if (timeRange === '1h' && diff > 60 * 60 * 1000) return false;
    if (timeRange === '6h' && diff > 6 * 60 * 60 * 1000) return false;
    if (timeRange === '24h' && diff > 24 * 60 * 60 * 1000) return false;
    
    return true;
  });

  const errorCount = filteredLogs.filter(l => l.level === 'error').length;
  const warnCount = filteredLogs.filter(l => l.level === 'warn').length;
  
  // Limit to last 200 events (performance)
  const displayLogs = filteredLogs.slice(-200);
  const hasMore = filteredLogs.length > 200;

  return (
    <div className="h-full flex flex-col">
      {/* Controls - Using semantic spacing */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 space-y-4 flex-shrink-0">
        {/* Live/Replay Mode Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-slate-850 rounded-2xl p-1.5 border border-slate-700">
            <button
              onClick={() => onToggleReplay?.(false)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all min-h-[48px] flex items-center gap-2 ${
                !isReplayMode 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              style={{ fontSize: 'var(--font-body-sm)' }}
            >
              Live
            </button>
            <button
              onClick={() => onToggleReplay?.(true)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all min-h-[48px] flex items-center gap-2 ${
                isReplayMode 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              style={{ fontSize: 'var(--font-body-sm)' }}
            >
              <MonitorPlay size={16} />
              Replay
            </button>
          </div>
          
          {!isReplayMode && (
            <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-5 h-5 bg-slate-700 border-2 border-slate-600 rounded accent-blue-600"
              />
              <span className="text-slate-300" style={{ fontSize: 'var(--font-body)' }}>Auto-scroll</span>
            </label>
          )}
        </div>

        {/* Replay Panel */}
        {isReplayMode && (
          <ReplayPanel
            isExpanded={isReplayPanelExpanded}
            onToggleExpanded={() => setIsReplayPanelExpanded(!isReplayPanelExpanded)}
          />
        )}

        {!isReplayMode && (
          <>
            {/* Time Range */}
            <div className="flex gap-2 overflow-x-auto pb-1 chips-scroll">
              {timeRanges.map(range => (
                <Chip
                  key={range.id}
                  label={range.label}
                  active={timeRange === range.id}
                  onClick={() => setTimeRange(range.id)}
                />
              ))}
            </div>

            {/* Level Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {levelFilters.map(filter => (
                <Chip
                  key={filter.id}
                  label={filter.label}
                  active={levelFilter === filter.id}
                  onClick={() => setLevelFilter(filter.id)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="secondary"
                icon={<TagIcon size={18} />}
                onClick={() => setShowTaggedOnly(!showTaggedOnly)}
              >
                {showTaggedOnly ? 'Show All' : 'Tagged Only'}
              </Button>
              <Button size="sm" variant="secondary" icon={<Download size={18} />} onClick={onExportCsv}>
                CSV
              </Button>
              <Button size="sm" variant="secondary" icon={<Download size={18} />} onClick={onExportJson}>
                JSON
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Logs List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        {/* Summary Cards - shown when logs are few */}
        {!isReplayMode && filteredLogs.length < 20 && filteredLogs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="!p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-600/20 rounded-xl">
                  <AlertCircle size={18} className="text-red-400" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Errors</div>
                  <div className="text-[18px] font-bold text-slate-100">{errorCount}</div>
                </div>
              </div>
            </Card>
            
            <Card className="!p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-600/20 rounded-xl">
                  <AlertTriangle size={18} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Warnings</div>
                  <div className="text-[18px] font-bold text-slate-100">{warnCount}</div>
                </div>
              </div>
            </Card>
            
            <Card className="!p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600/20 rounded-xl">
                  <Info size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Total</div>
                  <div className="text-[18px] font-bold text-slate-100">{filteredLogs.length}</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {isReplayMode && (
          <div className="bg-amber-600/20 border border-amber-600/50 rounded-2xl p-3 text-center mb-4">
            <span className="text-[14px] text-amber-400 font-semibold">
              Replay Mode • Live scanning disabled
            </span>
          </div>
        )}

        {!isReplayMode && !autoScroll && (
          <div className="bg-amber-600/20 border border-amber-600/50 rounded-2xl p-3 text-center mb-4">
            <span className="text-[14px] text-amber-400 font-semibold">
              Auto-scroll disabled
            </span>
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No logs found
          </div>
        ) : (
          <div className="space-y-2">
            {displayLogs.map(log => (
              <LogCard key={log.id} log={log} />
            ))}
            {hasMore && (
              <div className="text-center text-slate-400">
                {filteredLogs.length - 200} more logs
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LogCard({ log }: { log: Log }) {
  const levelColors = {
    info: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
    warn: 'bg-amber-600/20 text-amber-400 border-amber-600/40',
    error: 'bg-red-600/20 text-red-400 border-red-600/40'
  };

  const levelIcons = {
    info: <Info size={16} />,
    warn: <AlertTriangle size={16} />,
    error: <AlertCircle size={16} />
  };

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl p-4 ${log.isReplay ? 'ring-1 ring-amber-600/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl ${levelColors[log.level]} border`}>
          {levelIcons[log.level]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-400 font-medium">{log.source}</span>
              {log.isReplay && (
                <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-[10px] rounded-lg border border-amber-600/40 font-semibold">
                  REPLAY
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              {log.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="text-[14px] text-slate-200 mb-2">{log.message}</div>
          {log.tags && log.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {log.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[11px] rounded-lg"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}