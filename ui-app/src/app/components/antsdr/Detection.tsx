import { useState, useEffect } from 'react';
import { ChevronLeft, Info } from 'lucide-react';
import { Card } from '../Card';
import { NumericSlider } from './NumericSlider';
import { PresetChips } from './PresetChips';

interface DetectionProps {
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function Detection({ onBack, onDirtyChange }: DetectionProps) {
  const [minSnrDb, setMinSnrDb] = useState(10.0);
  const [maxPeaks, setMaxPeaks] = useState(6);
  const [minSpacingHz, setMinSpacingHz] = useState(250_000);
  const [edgeGuardHz, setEdgeGuardHz] = useState(100_000);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleChange = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setIsDirty(true);
  };

  const getSensitivityLabel = () => {
    if (minSnrDb < 8) return 'High (more noise)';
    if (minSnrDb < 15) return 'Medium';
    return 'Low (less noise)';
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
        <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Peak Detector</h2>
        {isDirty && (
          <span className="text-[12px] text-amber-400 font-semibold">Unsaved</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        <Card>
          <div className="space-y-5">
            <NumericSlider
              label="Min SNR (dB)"
              value={minSnrDb}
              onChange={handleChange(setMinSnrDb)}
              min={5}
              max={25}
              step={0.5}
              unit="dB"
              helpText="Higher values = fewer detections, less noise"
            />

            <NumericSlider
              label="Max Peaks"
              value={maxPeaks}
              onChange={handleChange(setMaxPeaks)}
              min={1}
              max={12}
              step={1}
              helpText="Maximum peaks to detect per sweep step"
            />
          </div>
        </Card>

        <Card>
          <PresetChips
            label="Min Spacing"
            options={[
              { label: '100 kHz', value: 100_000 },
              { label: '250 kHz', value: 250_000 },
              { label: '500 kHz', value: 500_000 }
            ]}
            value={minSpacingHz}
            onChange={handleChange(setMinSpacingHz)}
            helpText="Prevents duplicate peaks from same signal"
          />
        </Card>

        <Card>
          <PresetChips
            label="Edge Guard"
            options={[
              { label: '0 Hz', value: 0 },
              { label: '100 kHz', value: 100_000 },
              { label: '200 kHz', value: 200_000 },
              { label: '300 kHz', value: 300_000 }
            ]}
            value={edgeGuardHz}
            onChange={handleChange(setEdgeGuardHz)}
            helpText="Ignore peaks near band edges"
          />
        </Card>

        {/* Sensitivity Preview */}
        <Card>
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[14px] text-slate-100 font-semibold mb-1">
                Expected Sensitivity
              </div>
              <div className="text-[13px] text-slate-300 mb-2">
                {getSensitivityLabel()}
              </div>
              <div className="text-[12px] text-slate-500">
                Current Min SNR: {minSnrDb} dB
              </div>
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="text-[13px] text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Peak Detection</strong> identifies strong RF signals in each frequency step.
            Higher SNR thresholds reduce false positives but may miss weak signals.
          </div>
        </div>
      </div>
    </div>
  );
}
