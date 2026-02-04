import { useState, useEffect } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { Card } from '../Card';
import { NumericSlider } from './NumericSlider';
import { PresetChips } from './PresetChips';

interface TrackingProps {
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function Tracking({ onBack, onDirtyChange }: TrackingProps) {
  const [minTrackSnrDb, setMinTrackSnrDb] = useState(13.5);
  const [minHitsToConfirm, setMinHitsToConfirm] = useState(3);
  const [ttlS, setTtlS] = useState(30);
  const [binHz, setBinHz] = useState(250_000);
  const [mergeHz, setMergeHz] = useState(350_000);
  const [loGuardHz, setLoGuardHz] = useState(100_000);
  const [windowS, setWindowS] = useState(10);
  const [isDirty, setIsDirty] = useState(false);

  // Mock sweep cycle time - would come from actual config
  const estimatedSweepCycleTimeS = 2.4;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleChange = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setIsDirty(true);
  };

  const showTtlWarning = ttlS <= estimatedSweepCycleTimeS;
  const showRiskySettings = minTrackSnrDb < 10 && minHitsToConfirm === 1;

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
        <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Contact Tracker</h2>
        {isDirty && (
          <span className="text-[12px] text-amber-400 font-semibold">Unsaved</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        {/* Critical Warning */}
        {showTtlWarning && (
          <div className="bg-red-900/30 border border-red-600 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[14px] text-red-200 font-semibold mb-1">
                  TTL Too Short
                </div>
                <div className="text-[12px] text-red-300">
                  TTL ({ttlS}s) must be greater than sweep cycle time ({estimatedSweepCycleTimeS.toFixed(1)}s) or contacts will disappear between sweeps.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risky Settings Warning */}
        {showRiskySettings && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[14px] text-amber-200 font-semibold mb-1">
                  May Create False Contacts
                </div>
                <div className="text-[12px] text-amber-300">
                  Low SNR threshold + single hit confirmation may produce false positives.
                </div>
              </div>
            </div>
          </div>
        )}

        <Card>
          <div className="space-y-5">
            <NumericSlider
              label="Min Track SNR (dB)"
              value={minTrackSnrDb}
              onChange={handleChange(setMinTrackSnrDb)}
              min={8}
              max={25}
              step={0.5}
              unit="dB"
              helpText="SNR threshold for tracking existing contacts"
            />

            <NumericSlider
              label="Min Hits to Confirm"
              value={minHitsToConfirm}
              onChange={handleChange(setMinHitsToConfirm)}
              min={1}
              max={6}
              step={1}
              helpText="Detections needed before creating contact"
              warningThreshold={2}
              warningMessage="Low confirmation threshold may create false contacts"
            />

            <NumericSlider
              label="TTL (seconds)"
              value={ttlS}
              onChange={handleChange(setTtlS)}
              min={5}
              max={120}
              step={5}
              unit="s"
              helpText={`Must be > sweep cycle time (${estimatedSweepCycleTimeS.toFixed(1)}s)`}
            />
          </div>
        </Card>

        <Card>
          <PresetChips
            label="Bin Size"
            options={[
              { label: '100 kHz', value: 100_000 },
              { label: '250 kHz', value: 250_000 },
              { label: '500 kHz', value: 500_000 }
            ]}
            value={binHz}
            onChange={handleChange(setBinHz)}
            helpText="Frequency bin for grouping peaks"
          />
        </Card>

        <Card>
          <PresetChips
            label="Merge Distance"
            options={[
              { label: '200 kHz', value: 200_000 },
              { label: '350 kHz', value: 350_000 },
              { label: '500 kHz', value: 500_000 },
              { label: '1 MHz', value: 1_000_000 }
            ]}
            value={mergeHz}
            onChange={handleChange(setMergeHz)}
            helpText="Max distance to merge contacts"
          />
        </Card>

        <Card>
          <PresetChips
            label="LO Guard"
            options={[
              { label: '50 kHz', value: 50_000 },
              { label: '100 kHz', value: 100_000 },
              { label: '200 kHz', value: 200_000 },
              { label: '500 kHz', value: 500_000 }
            ]}
            value={loGuardHz}
            onChange={handleChange(setLoGuardHz)}
            helpText="Ignore signals near LO frequency"
          />
        </Card>

        <Card>
          <PresetChips
            label="Window (seconds)"
            options={[
              { label: '5s', value: 5 },
              { label: '10s', value: 10 },
              { label: '20s', value: 20 }
            ]}
            value={windowS}
            onChange={handleChange(setWindowS)}
            helpText="Time window for contact confirmation"
          />
        </Card>

        {/* Info Box */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="text-[13px] text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Contact Tracking</strong> converts detected peaks into persistent RF contacts.
            TTL controls how long contacts survive without new detections.
          </div>
        </div>
      </div>
    </div>
  );
}
