import { useState } from 'react';
import { FileText, Upload, Calendar, Hash } from 'lucide-react';
import { Button } from '@/app/components/Button';
import { Card } from '@/app/components/Card';

interface ReplayFile {
  filename: string;
  path: string;
  startTime: Date;
  endTime: Date;
  totalEvents: number;
  eventCounts: {
    rid: number;
    fpv: number;
    system: number;
    error: number;
  };
  size: number;
}

interface ReplayFilePickerProps {
  selectedFile: ReplayFile | null;
  onFileSelect: (file: ReplayFile) => void;
  onBrowse: () => void;
}

// Mock replay files - in production, this would come from /opt/ndefender/logs/
const mockReplayFiles: ReplayFile[] = [
  {
    filename: 'replay_2026-01-23_14-30-00.jsonl',
    path: '/opt/ndefender/logs/replay_2026-01-23_14-30-00.jsonl',
    startTime: new Date(Date.now() - 7200000),
    endTime: new Date(Date.now() - 3600000),
    totalEvents: 1247,
    eventCounts: { rid: 432, fpv: 687, system: 98, error: 30 },
    size: 2.4 * 1024 * 1024
  },
  {
    filename: 'replay_2026-01-23_12-00-00.jsonl',
    path: '/opt/ndefender/logs/replay_2026-01-23_12-00-00.jsonl',
    startTime: new Date(Date.now() - 14400000),
    endTime: new Date(Date.now() - 10800000),
    totalEvents: 892,
    eventCounts: { rid: 301, fpv: 512, system: 62, error: 17 },
    size: 1.8 * 1024 * 1024
  },
  {
    filename: 'replay_2026-01-22_18-45-00.jsonl',
    path: '/opt/ndefender/logs/replay_2026-01-22_18-45-00.jsonl',
    startTime: new Date(Date.now() - 86400000),
    endTime: new Date(Date.now() - 82800000),
    totalEvents: 2103,
    eventCounts: { rid: 789, fpv: 1201, system: 87, error: 26 },
    size: 4.1 * 1024 * 1024
  }
];

export function ReplayFilePicker({ selectedFile, onFileSelect, onBrowse }: ReplayFilePickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-2xl text-left text-[14px] text-slate-200 flex items-center gap-2 hover:bg-slate-750 transition-colors"
          >
            <FileText size={16} className="text-slate-400" />
            <span className="flex-1 truncate">
              {selectedFile ? selectedFile.filename : 'Select replay file...'}
            </span>
          </button>
          
          {showDropdown && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto">
              {mockReplayFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => {
                    onFileSelect(file);
                    setShowDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-750 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl ${
                    selectedFile?.path === file.path ? 'bg-blue-600/20' : ''
                  }`}
                >
                  <div className="text-[13px] font-medium text-slate-200 mb-1">
                    {file.filename}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {file.startTime.toLocaleDateString()} • {formatDuration(file.startTime, file.endTime)} • {formatFileSize(file.size)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          variant="secondary"
          icon={<Upload size={18} />}
          onClick={onBrowse}
        >
          Browse
        </Button>
      </div>
      
      {/* File Metadata */}
      {selectedFile && (
        <Card className="!p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-[11px] text-slate-400 font-medium">Time Range</span>
              </div>
              <div className="text-[13px] text-slate-200">
                {selectedFile.startTime.toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              <div className="text-[11px] text-slate-400">
                to {selectedFile.endTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Hash size={14} className="text-slate-400" />
                <span className="text-[11px] text-slate-400 font-medium">Total Events</span>
              </div>
              <div className="text-[18px] font-bold text-slate-100">
                {selectedFile.totalEvents.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-[11px] text-slate-400 mb-2 font-medium">Event Types</div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-[14px] font-semibold text-purple-400">
                  {selectedFile.eventCounts.rid}
                </div>
                <div className="text-[10px] text-slate-500">RID</div>
              </div>
              <div className="text-center">
                <div className="text-[14px] font-semibold text-pink-400">
                  {selectedFile.eventCounts.fpv}
                </div>
                <div className="text-[10px] text-slate-500">FPV</div>
              </div>
              <div className="text-center">
                <div className="text-[14px] font-semibold text-blue-400">
                  {selectedFile.eventCounts.system}
                </div>
                <div className="text-[10px] text-slate-500">System</div>
              </div>
              <div className="text-center">
                <div className="text-[14px] font-semibold text-red-400">
                  {selectedFile.eventCounts.error}
                </div>
                <div className="text-[10px] text-slate-500">Errors</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
