import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../Card';
import { PresetChips } from './PresetChips';

interface ClassificationProps {
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function Classification({ onBack, onDirtyChange }: ClassificationProps) {
  const [mode, setMode] = useState<'conservative' | 'aggressive'>('conservative');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [narrowMaxHz, setNarrowMaxHz] = useState(100_000);
  const [wideMinHz, setWideMinHz] = useState(1_000_000);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode);
    setIsDirty(true);
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
        <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Classification</h2>
        {isDirty && (
          <span className="text-[12px] text-amber-400 font-semibold">Unsaved</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        <Card>
          <PresetChips
            label="Classification Mode"
            options={[
              { label: 'Conservative', value: 'conservative' },
              { label: 'Aggressive', value: 'aggressive' }
            ]}
            value={mode}
            onChange={handleModeChange}
            helpText="Conservative: fewer classifications. Aggressive: more attempts."
          />
        </Card>

        {/* Advanced Settings (Collapsible) */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-colors flex items-center justify-between min-h-[56px]"
        >
          <div className="text-left">
            <div className="text-[14px] font-semibold text-slate-100">Advanced Settings</div>
            <div className="text-[12px] text-slate-400">Bandwidth thresholds</div>
          </div>
          {showAdvanced ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </button>

        {showAdvanced && (
          <Card>
            <div className="space-y-4">
              <div className="text-[13px] text-amber-300 bg-amber-900/20 border border-amber-700 rounded-xl p-3">
                ⚠ Advanced: These settings affect signal classification accuracy.
              </div>

              <div>
                <label className="text-[14px] text-slate-300 font-medium mb-2 block">
                  Narrow Bandwidth Max (Hz)
                </label>
                <input
                  type="number"
                  value={narrowMaxHz}
                  onChange={(e) => {
                    setNarrowMaxHz(Number(e.target.value));
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2.5 text-[14px] bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 min-h-[48px]"
                />
                <div className="text-[12px] text-slate-500 mt-1">
                  Signals narrower than this are classified as narrow-band
                </div>
              </div>

              <div>
                <label className="text-[14px] text-slate-300 font-medium mb-2 block">
                  Wide Bandwidth Min (Hz)
                </label>
                <input
                  type="number"
                  value={wideMinHz}
                  onChange={(e) => {
                    setWideMinHz(Number(e.target.value));
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2.5 text-[14px] bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 min-h-[48px]"
                />
                <div className="text-[12px] text-slate-500 mt-1">
                  Signals wider than this are classified as wide-band
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Info Box */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="text-[13px] text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Signal Classification</strong> attempts to categorize detected RF contacts.
            Conservative mode reduces false classifications.
          </div>
        </div>
      </div>
    </div>
  );
}
