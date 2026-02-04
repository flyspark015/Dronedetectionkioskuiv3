import { useState, useEffect } from 'react';
import { ChevronLeft, FileText, Download } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { PresetChips } from './PresetChips';
import { rfScanAction } from '@/app/services/settings';

interface OutputLoggingProps {
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function OutputLogging({ onBack, onDirtyChange }: OutputLoggingProps) {
  const [outputMode, setOutputMode] = useState<'stdout' | 'file'>('stdout');
  const [logLevel, setLogLevel] = useState<'quiet' | 'normal' | 'debug'>('normal');
  const [showRawPeaks, setShowRawPeaks] = useState(false);
  const [showRfContactsOnly, setShowRfContactsOnly] = useState(true);
  const [filePath, setFilePath] = useState('/var/log/rfsensor/scan.log');
  const [filePathEditable, setFilePathEditable] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleChange = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setIsDirty(true);
  };

  const handleExportConfig = async () => {
    const res = await rfScanAction('output_export_config', { format: 'json' });
    if (!res.ok) {
      alert('Not supported in this build');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700"
        >
          <ChevronLeft size={20} className="text-slate-300" />
        </button>
        <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Output & Logging</h2>
        {isDirty && (
          <span className="text-[12px] text-amber-400 font-semibold">Unsaved</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        <Card>
          <PresetChips
            label="Output Mode"
            options={[
              { label: 'Stdout', value: 'stdout' },
              { label: 'File', value: 'file' }
            ]}
            value={outputMode}
            onChange={handleChange(setOutputMode)}
            helpText="Where to write scan output"
          />
        </Card>

        {/* File Path (only if file mode) */}
        {outputMode === 'file' && (
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[14px] text-slate-300 font-medium">Log File Path</label>
                <button
                  onClick={() => setFilePathEditable(!filePathEditable)}
                  className="text-[12px] text-blue-400 font-semibold hover:text-blue-300"
                >
                  {filePathEditable ? 'Lock' : 'Edit'}
                </button>
              </div>
              <input
                type="text"
                value={filePath}
                onChange={(e) => {
                  setFilePath(e.target.value);
                  setIsDirty(true);
                }}
                readOnly={!filePathEditable}
                className={`w-full px-3 py-2.5 text-[14px] bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 min-h-[48px] ${
                  !filePathEditable ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </Card>
        )}

        <Card>
          <PresetChips
            label="Log Level"
            options={[
              { label: 'Quiet', value: 'quiet' },
              { label: 'Normal', value: 'normal' },
              { label: 'Debug', value: 'debug' }
            ]}
            value={logLevel}
            onChange={handleChange(setLogLevel)}
            helpText="Verbosity of log output"
          />
        </Card>

        {/* Toggles */}
        <Card>
          <div className="space-y-4">
            <div className="text-[14px] text-slate-300 font-medium mb-3">Event Filters</div>
            
            <div className="flex justify-between items-center min-h-[56px]">
              <div>
                <div className="text-[15px] text-slate-100 font-medium">Show Raw PEAK Events</div>
                <div className="text-[12px] text-slate-500">Debug only - high volume</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer touch-target-primary">
                <input
                  type="checkbox"
                  checked={showRawPeaks}
                  onChange={(e) => handleChange(setShowRawPeaks)(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-16 h-9 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900"></div>
              </label>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-700 min-h-[56px]">
              <div>
                <div className="text-[15px] text-slate-100 font-medium">Show RF_CONTACT Only</div>
                <div className="text-[12px] text-slate-500">Normal mode - tracked contacts</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer touch-target-primary">
                <input
                  type="checkbox"
                  checked={showRfContactsOnly}
                  onChange={(e) => handleChange(setShowRfContactsOnly)(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-16 h-9 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Export Config */}
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-slate-400" />
              <div className="text-[14px] text-slate-300 font-medium">Export Configuration</div>
            </div>
            <Button
              size="md"
              variant="secondary"
              icon={<Download size={16} />}
              onClick={handleExportConfig}
              fullWidth
            >
              Export Current Config (JSON)
            </Button>
            <div className="text-[12px] text-slate-500">
              Download current configuration as JSON for backup or sharing
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="text-[13px] text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Output Settings</strong> control where and how scan data is logged.
            Debug mode generates high-volume output.
          </div>
        </div>
      </div>
    </div>
  );
}
