import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { FrequencyInput } from './FrequencyInput';
import { PresetChips } from './PresetChips';
import type { SweepPlan } from '@/app/types/antsdr-config';

interface SweepPlanEditorProps {
  plan: SweepPlan;
  onSave: (plan: SweepPlan) => void;
  onCancel: () => void;
}

export function SweepPlanEditor({ plan, onSave, onCancel }: SweepPlanEditorProps) {
  const [editedPlan, setEditedPlan] = useState<SweepPlan>(plan);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Validate on change
    const newErrors: Record<string, string> = {};
    
    if (editedPlan.step_hz > editedPlan.sample_rate_hz) {
      newErrors.step_hz = 'Step size must be ≤ Sample Rate';
    }
    
    if (editedPlan.rf_bandwidth_hz > editedPlan.sample_rate_hz) {
      newErrors.rf_bandwidth_hz = 'RF Bandwidth must be ≤ Sample Rate';
    }
    
    if (editedPlan.start_hz >= editedPlan.stop_hz) {
      newErrors.stop_hz = 'Stop frequency must be > Start frequency';
    }
    
    const steps = Math.ceil((editedPlan.stop_hz - editedPlan.start_hz) / editedPlan.step_hz) + 1;
    if (steps > 500) {
      newErrors.step_hz = 'Too many steps (>500). Increase step size.';
    }
    
    setErrors(newErrors);
  }, [editedPlan]);

  const handleSave = () => {
    if (Object.keys(errors).length === 0) {
      onSave(editedPlan);
    }
  };

  const computeStats = () => {
    const range = editedPlan.stop_hz - editedPlan.start_hz;
    const steps = Math.ceil(range / editedPlan.step_hz) + 1;
    const timeMs = steps * (editedPlan.dwell_ms || 10);
    const timeSec = timeMs / 1000;
    return { steps, timeSec };
  };

  const stats = computeStats();
  const isValid = Object.keys(errors).length === 0;

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-2xl bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-700 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-slate-100">
            {plan.id ? 'Edit Sweep Plan' : 'New Sweep Plan'}
          </h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700"
          >
            <X size={20} className="text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
          {/* Plan Name */}
          <div>
            <label className="text-[14px] text-slate-300 font-medium mb-2 block">Plan Name</label>
            <input
              type="text"
              value={editedPlan.name}
              onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
              className="w-full px-3 py-2.5 text-[14px] bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 min-h-[48px]"
              placeholder="e.g., VTX_58, 2G4, 900"
            />
          </div>

          {/* Frequencies */}
          <Card>
            <div className="space-y-4">
              <FrequencyInput
                label="Start Frequency"
                value={editedPlan.start_hz}
                onChange={(value) => setEditedPlan({ ...editedPlan, start_hz: value })}
              />
              <FrequencyInput
                label="Stop Frequency"
                value={editedPlan.stop_hz}
                onChange={(value) => setEditedPlan({ ...editedPlan, stop_hz: value })}
                error={errors.stop_hz}
              />
              <FrequencyInput
                label="Step Size"
                value={editedPlan.step_hz}
                onChange={(value) => setEditedPlan({ ...editedPlan, step_hz: value })}
                helpText="Must be ≤ Sample Rate"
                error={errors.step_hz}
              />
            </div>
          </Card>

          {/* Sample Rate */}
          <Card>
            <PresetChips
              label="Sample Rate"
              options={[
                { label: '2 MHz', value: 2_000_000 },
                { label: '5 MHz', value: 5_000_000 },
                { label: '10 MHz', value: 10_000_000 },
                { label: '20 MHz', value: 20_000_000 }
              ]}
              value={editedPlan.sample_rate_hz}
              onChange={(value) => setEditedPlan({ ...editedPlan, sample_rate_hz: value })}
            />
          </Card>

          {/* RF Bandwidth */}
          <Card>
            <div>
              <label className="text-[14px] text-slate-300 font-medium mb-2 block">
                RF Bandwidth
              </label>
              <input
                type="number"
                value={editedPlan.rf_bandwidth_hz}
                onChange={(e) => setEditedPlan({ ...editedPlan, rf_bandwidth_hz: Number(e.target.value) })}
                className={`w-full px-3 py-2.5 text-[14px] bg-slate-800 border rounded-xl text-slate-100 focus:outline-none min-h-[48px] ${
                  errors.rf_bandwidth_hz ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.rf_bandwidth_hz && (
                <div className="text-[12px] text-red-400 mt-1">⚠ {errors.rf_bandwidth_hz}</div>
              )}
              <div className="text-[12px] text-slate-500 mt-1">
                Must be ≤ Sample Rate ({editedPlan.sample_rate_hz / 1_000_000} MHz)
              </div>
            </div>
          </Card>

          {/* Dwell Time */}
          <Card>
            <div>
              <label className="text-[14px] text-slate-300 font-medium mb-2 block">
                Dwell Time (ms)
              </label>
              <input
                type="number"
                value={editedPlan.dwell_ms || 10}
                onChange={(e) => setEditedPlan({ ...editedPlan, dwell_ms: Number(e.target.value) })}
                className="w-full px-3 py-2.5 text-[14px] bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 min-h-[48px]"
              />
              <div className="text-[12px] text-slate-500 mt-1">
                Time spent per frequency step
              </div>
            </div>
          </Card>

          {/* Computed Preview */}
          <Card>
            <div className="space-y-2">
              <div className="text-[14px] text-slate-300 font-medium mb-2">Computed Preview</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 mb-1">Total Steps</div>
                  <div className={`text-[18px] font-bold ${
                    stats.steps > 500 ? 'text-red-400' : stats.steps > 300 ? 'text-amber-400' : 'text-slate-100'
                  }`}>
                    {stats.steps}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 mb-1">Plan Time</div>
                  <div className="text-[18px] font-bold text-slate-100">
                    {stats.timeSec.toFixed(2)}s
                  </div>
                </div>
              </div>
              {stats.steps > 500 && (
                <div className="text-[11px] text-red-400">
                  ⚠ Steps exceed 500 limit. Increase step size or reduce frequency range.
                </div>
              )}
              {stats.steps > 300 && stats.steps <= 500 && (
                <div className="text-[11px] text-amber-400">
                  ⚠ Steps exceed 300 (warning threshold).
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-slate-700 flex gap-3">
          <Button
            size="md"
            variant="secondary"
            onClick={onCancel}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={<Save size={16} />}
            onClick={handleSave}
            disabled={!isValid}
            fullWidth
          >
            Save Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
