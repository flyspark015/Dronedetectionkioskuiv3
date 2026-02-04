import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, GripVertical, ChevronUp, ChevronDown, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { SweepPlanEditor } from './SweepPlanEditor';
import type { SweepPlan } from '@/app/types/antsdr-config';
import { rfScanAction } from '@/app/services/settings';

interface SweepPlansProps {
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

// Mock data
const initialPlans: SweepPlan[] = [
  {
    id: '1',
    name: 'VTX_58',
    enabled: true,
    start_hz: 5645_000_000,
    stop_hz: 5945_000_000,
    step_hz: 250_000,
    sample_rate_hz: 20_000_000,
    rf_bandwidth_hz: 20_000_000,
    priority: 1,
    dwell_ms: 10
  },
  {
    id: '2',
    name: '2G4',
    enabled: true,
    start_hz: 2400_000_000,
    stop_hz: 2483_500_000,
    step_hz: 500_000,
    sample_rate_hz: 20_000_000,
    rf_bandwidth_hz: 20_000_000,
    priority: 2,
    dwell_ms: 10
  },
  {
    id: '3',
    name: '900',
    enabled: false,
    start_hz: 902_000_000,
    stop_hz: 928_000_000,
    step_hz: 500_000,
    sample_rate_hz: 10_000_000,
    rf_bandwidth_hz: 10_000_000,
    priority: 3
  }
];

export function SweepPlans({ onBack, onDirtyChange }: SweepPlansProps) {
  const [plans, setPlans] = useState<SweepPlan[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<SweepPlan | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const computePlanStats = (plan: SweepPlan) => {
    const range = plan.stop_hz - plan.start_hz;
    const steps = Math.ceil(range / plan.step_hz) + 1;
    const timeMs = steps * (plan.dwell_ms || 10);
    const timeSec = timeMs / 1000;
    
    // Validation
    const hasStepError = plan.step_hz > plan.sample_rate_hz;
    const hasBandwidthError = plan.rf_bandwidth_hz > plan.sample_rate_hz;
    const hasStepWarning = steps > 300;
    const hasStepBlock = steps > 500;
    
    return {
      steps,
      timeMs,
      timeSec,
      hasStepError,
      hasBandwidthError,
      hasStepWarning,
      hasStepBlock,
      isValid: !hasStepError && !hasBandwidthError && !hasStepBlock
    };
  };

  const computeGlobalStats = () => {
    const enabledPlans = plans.filter(p => p.enabled);
    const totalSteps = enabledPlans.reduce((sum, plan) => {
      const stats = computePlanStats(plan);
      return sum + stats.steps;
    }, 0);
    const totalTimeMs = enabledPlans.reduce((sum, plan) => {
      const stats = computePlanStats(plan);
      return sum + stats.timeMs;
    }, 0);
    const totalTimeSec = totalTimeMs / 1000;
    
    const hasAnyErrors = enabledPlans.some(plan => {
      const stats = computePlanStats(plan);
      return !stats.isValid;
    });
    
    return {
      enabledCount: enabledPlans.length,
      totalSteps,
      totalTimeSec,
      hasErrors: hasAnyErrors
    };
  };

  const globalStats = computeGlobalStats();

  const handleTogglePlan = (id: string) => {
    setPlans(plans.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    setIsDirty(true);
  };

  const handleEditPlan = (plan: SweepPlan) => {
    setEditingPlan(plan);
  };

  const handleSavePlan = (updatedPlan: SweepPlan) => {
    setPlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    setEditingPlan(null);
    setIsDirty(true);
  };

  const handleDeletePlan = (id: string) => {
    const confirmed = window.confirm('Delete this sweep plan?');
    if (confirmed) {
      setPlans(plans.filter(p => p.id !== id));
      setIsDirty(true);
    }
  };

  const handleAddPlan = () => {
    const newPlan: SweepPlan = {
      id: Date.now().toString(),
      name: 'New Plan',
      enabled: true,
      start_hz: 5800_000_000,
      stop_hz: 5900_000_000,
      step_hz: 250_000,
      sample_rate_hz: 20_000_000,
      rf_bandwidth_hz: 20_000_000,
      priority: plans.length + 1,
      dwell_ms: 10
    };
    setEditingPlan(newPlan);
  };

  const handleMovePlan = (id: string, direction: 'up' | 'down') => {
    const index = plans.findIndex(p => p.id === id);
    if (direction === 'up' && index > 0) {
      const newPlans = [...plans];
      [newPlans[index], newPlans[index - 1]] = [newPlans[index - 1], newPlans[index]];
      setPlans(newPlans);
      setIsDirty(true);
    } else if (direction === 'down' && index < plans.length - 1) {
      const newPlans = [...plans];
      [newPlans[index], newPlans[index + 1]] = [newPlans[index + 1], newPlans[index]];
      setPlans(newPlans);
      setIsDirty(true);
    }
  };

  const handleValidate = async () => {
    const res = await rfScanAction('sweep_plans_validate');
    if (!res.ok) {
      alert('Not supported in this build');
      return;
    }
    alert('Validation complete. Check Safety & Validation for details.');
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700"
          >
            <ChevronLeft size={20} className="text-slate-300" />
          </button>
          <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Sweep Plans</h2>
          {isDirty && (
            <span className="text-[12px] text-amber-400 font-semibold">Unsaved</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
          {/* Global Summary */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[14px] text-slate-300 font-medium">Sweep Summary</div>
                {globalStats.hasErrors ? (
                  <div className="flex items-center gap-1 text-[12px] text-red-400">
                    <AlertTriangle size={14} />
                    <span>Has Errors</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[12px] text-green-400">
                    <CheckCircle size={14} />
                    <span>Valid</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Enabled Plans" value={globalStats.enabledCount.toString()} />
                <StatBox label="Total Steps" value={globalStats.totalSteps.toString()} />
                <StatBox label="Cycle Time" value={`${globalStats.totalTimeSec.toFixed(2)}s`} />
              </div>
              <Button
                size="md"
                variant="secondary"
                onClick={handleValidate}
                fullWidth
              >
                Run Quick Validate
              </Button>
            </div>
          </Card>

          {/* Plans List */}
          <div className="space-y-3">
            {plans.map((plan, index) => {
              const stats = computePlanStats(plan);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  stats={stats}
                  isFirst={index === 0}
                  isLast={index === plans.length - 1}
                  onToggle={() => handleTogglePlan(plan.id)}
                  onEdit={() => handleEditPlan(plan)}
                  onDelete={() => handleDeletePlan(plan.id)}
                  onMoveUp={() => handleMovePlan(plan.id, 'up')}
                  onMoveDown={() => handleMovePlan(plan.id, 'down')}
                />
              );
            })}
          </div>

          {/* Add Plan Button */}
          <button
            onClick={handleAddPlan}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-600 hover:border-blue-500 hover:bg-slate-800/50 active:bg-slate-700/50 transition-colors min-h-[64px] flex items-center justify-center gap-2 text-slate-400 hover:text-blue-400"
          >
            <Plus size={20} />
            <span className="text-[14px] font-semibold">Add Sweep Plan</span>
          </button>
        </div>
      </div>

      {/* Editor Bottom Sheet */}
      {editingPlan && (
        <SweepPlanEditor
          plan={editingPlan}
          onSave={handleSavePlan}
          onCancel={() => setEditingPlan(null)}
        />
      )}
    </>
  );
}

interface PlanCardProps {
  plan: SweepPlan;
  stats: ReturnType<typeof SweepPlans extends (props: any) => any ? never : any>;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function PlanCard({ plan, stats, isFirst, isLast, onToggle, onEdit, onDelete, onMoveUp, onMoveDown }: PlanCardProps) {
  return (
    <Card className={`${!plan.enabled ? 'opacity-60' : ''}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 pt-1">
            <GripVertical size={18} className="text-slate-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={plan.name}
                readOnly
                className="bg-transparent text-[15px] font-semibold text-slate-100 border-none outline-none"
              />
              {!stats.isValid && (
                <AlertTriangle size={16} className="text-red-400" />
              )}
            </div>
            <div className="text-[12px] text-slate-400">
              {(plan.start_hz / 1_000_000).toFixed(0)} - {(plan.stop_hz / 1_000_000).toFixed(0)} MHz
            </div>
          </div>
          <div className="flex items-center gap-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={plan.enabled}
                onChange={onToggle}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Frequency Bar */}
        <div className="bg-slate-800 rounded-lg p-2 relative h-8">
          <div className="absolute inset-0 flex items-center px-2">
            <div className="flex-1 h-1 bg-blue-600 rounded-full" />
          </div>
          <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-slate-400">
            <span>{(plan.start_hz / 1_000_000).toFixed(0)}M</span>
            <span>{(plan.stop_hz / 1_000_000).toFixed(0)}M</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <div className="text-slate-500">Steps</div>
            <div className={`font-semibold ${stats.hasStepBlock ? 'text-red-400' : stats.hasStepWarning ? 'text-amber-400' : 'text-slate-200'}`}>
              {stats.steps}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Time</div>
            <div className="text-slate-200 font-semibold">{stats.timeSec.toFixed(2)}s</div>
          </div>
          <div>
            <div className="text-slate-500">Sample Rate</div>
            <div className="text-slate-200 font-semibold">{plan.sample_rate_hz / 1_000_000}M</div>
          </div>
        </div>

        {/* Errors */}
        {(stats.hasStepError || stats.hasBandwidthError || stats.hasStepBlock) && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-2 text-[11px] text-red-300">
            {stats.hasStepError && <div>⚠ Step &gt; Sample Rate (BLOCKED)</div>}
            {stats.hasBandwidthError && <div>⚠ RF BW &gt; Sample Rate (BLOCKED)</div>}
            {stats.hasStepBlock && <div>⚠ Steps &gt; 500 (BLOCKED)</div>}
          </div>
        )}
        {stats.hasStepWarning && !stats.hasStepBlock && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-2 text-[11px] text-amber-300">
            ⚠ Steps &gt; 300 (WARNING)
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-[12px] font-semibold text-slate-200 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Edit size={14} />
            Edit
          </button>
          <div className="flex gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronUp size={16} className="text-slate-300" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronDown size={16} className="text-slate-300" />
            </button>
          </div>
          <button
            onClick={onDelete}
            className="p-2 bg-slate-800 hover:bg-red-900/50 active:bg-red-900/70 rounded-xl text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-2 text-center">
      <div className="text-[11px] text-slate-400 mb-1">{label}</div>
      <div className="text-[15px] font-bold text-slate-100">{value}</div>
    </div>
  );
}
