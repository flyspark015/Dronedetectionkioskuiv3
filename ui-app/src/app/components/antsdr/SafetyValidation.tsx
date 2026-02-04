import { useState } from 'react';
import { ChevronLeft, AlertTriangle, CheckCircle, XCircle, RefreshCw, Check, Clock } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { rfScanAction } from '@/app/services/settings';

interface SafetyValidationProps {
  onBack: () => void;
}

interface ValidationCheck {
  id: string;
  field: string;
  status: 'pass' | 'warning' | 'blocked';
  message: string;
  fixAction?: string;
  navigateTo?: string;
}

export function SafetyValidation({ onBack }: SafetyValidationProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidated, setLastValidated] = useState<Date | null>(new Date());
  const [lastApplied, setLastApplied] = useState<Date | null>(new Date(Date.now() - 120000)); // 2 min ago

  // Mock validation results - would come from actual validation logic
  const [checks] = useState<ValidationCheck[]>([
    {
      id: '1',
      field: 'VTX_58 Plan',
      status: 'blocked',
      message: 'Step size (300 kHz) exceeds sample rate (250 kHz)',
      fixAction: 'Reduce step size or increase sample rate',
      navigateTo: 'sweep-plans'
    },
    {
      id: '2',
      field: 'VTX_58 Plan',
      status: 'blocked',
      message: 'RF Bandwidth (25 MHz) exceeds sample rate (20 MHz)',
      fixAction: 'Reduce RF bandwidth',
      navigateTo: 'sweep-plans'
    },
    {
      id: '3',
      field: '2G4 Plan',
      status: 'warning',
      message: 'Steps count (387) exceeds warning threshold (300)',
      fixAction: 'Increase step size to reduce steps',
      navigateTo: 'sweep-plans'
    },
    {
      id: '4',
      field: 'Tracking TTL',
      status: 'blocked',
      message: 'TTL (2s) is less than sweep cycle time (2.4s)',
      fixAction: 'Increase TTL to at least 3s',
      navigateTo: 'tracking'
    },
    {
      id: '5',
      field: 'Tracking Settings',
      status: 'warning',
      message: 'Low SNR (8 dB) + single hit confirmation may create false contacts',
      fixAction: 'Increase min hits or SNR threshold',
      navigateTo: 'tracking'
    },
    {
      id: '6',
      field: 'Detection Settings',
      status: 'pass',
      message: 'All detection parameters within safe ranges',
    },
    {
      id: '7',
      field: 'Output Settings',
      status: 'pass',
      message: 'Output configuration valid',
    }
  ]);

  const blockedCount = checks.filter(c => c.status === 'blocked').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const passCount = checks.filter(c => c.status === 'pass').length;
  
  const canApply = blockedCount === 0;
  const hasChanges = true; // Mock - would track actual dirty state

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      setLastValidated(new Date());
    }, 1500);
  };

  const handleValidateBackend = () => {
    rfScanAction('safety_validate').then((res) => {
      if (!res.ok) {
        alert('Not supported in this build');
      }
    });
  };

  const handleApply = () => {
    if (!canApply) return;
    
    const confirmed = window.confirm('Apply configuration changes to Scan Service?');
    if (!confirmed) return;
    rfScanAction('safety_apply').then((res) => {
      if (!res.ok) {
        alert('Not supported in this build');
        return;
      }
      setLastApplied(new Date());
      alert('Configuration applied successfully!');
    });
  };

  const handleFixNavigate = (navigateTo?: string) => {
    if (navigateTo) {
      // Would navigate to the specific settings page
    }
  };

  const getRelativeTime = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
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
        <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Safety & Validation</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        {/* Status Banner */}
        {blockedCount > 0 ? (
          <div className="bg-red-900/30 border border-red-600 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <XCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[16px] text-red-200 font-bold mb-1">
                  Configuration Blocked
                </div>
                <div className="text-[13px] text-red-300">
                  {blockedCount} critical issue{blockedCount > 1 ? 's' : ''} must be fixed before applying.
                </div>
              </div>
            </div>
          </div>
        ) : warningCount > 0 ? (
          <div className="bg-amber-900/30 border border-amber-600 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[16px] text-amber-200 font-bold mb-1">
                  Warnings Present
                </div>
                <div className="text-[13px] text-amber-300">
                  {warningCount} warning{warningCount > 1 ? 's' : ''}. Configuration can be applied but review recommended.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-900/30 border border-green-600 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={24} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[16px] text-green-200 font-bold mb-1">
                  Configuration Valid
                </div>
                <div className="text-[13px] text-green-300">
                  All checks passed. Safe to apply.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <Card>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-[24px] font-bold text-red-400">{blockedCount}</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Blocked</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-bold text-amber-400">{warningCount}</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-bold text-green-400">{passCount}</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Passed</div>
            </div>
          </div>
        </Card>

        {/* Validation Checks */}
        <div className="space-y-2">
          <div className="text-[14px] font-semibold text-slate-100 mb-2">Validation Checks</div>
          {checks.map(check => (
            <CheckCard key={check.id} check={check} onFix={() => handleFixNavigate(check.navigateTo)} />
          ))}
        </div>

        {/* Validation Actions */}
        <Card>
          <div className="space-y-2">
            <div className="text-[14px] font-semibold text-slate-100 mb-3">Run Validation</div>
            <Button
              size="md"
              variant="secondary"
              icon={isValidating ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              onClick={handleValidate}
              disabled={isValidating}
              fullWidth
            >
              {isValidating ? 'Validating...' : 'Validate (Client)'}
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={handleValidateBackend}
              fullWidth
            >
              Validate with Backend
            </Button>
            {lastValidated && (
              <div className="text-[12px] text-slate-500 text-center pt-1">
                Last validated: {getRelativeTime(lastValidated)}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Apply Footer */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-slate-700 bg-slate-900 space-y-3">
        {/* Status Row */}
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={14} />
            <span>Last applied: {getRelativeTime(lastApplied)}</span>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Changes pending</span>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <Button
          size="lg"
          variant="primary"
          icon={<Check size={18} />}
          onClick={handleApply}
          disabled={!canApply}
          fullWidth
        >
          {canApply ? 'Apply Configuration' : 'Fix Errors to Apply'}
        </Button>

        {!canApply && (
          <div className="text-[11px] text-red-400 text-center">
            ⚠ Cannot apply: {blockedCount} critical issue{blockedCount > 1 ? 's' : ''} must be resolved
          </div>
        )}
      </div>
    </div>
  );
}

interface CheckCardProps {
  check: ValidationCheck;
  onFix: () => void;
}

function CheckCard({ check, onFix }: CheckCardProps) {
  const getIcon = () => {
    switch (check.status) {
      case 'pass':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-400" />;
      case 'blocked':
        return <XCircle size={18} className="text-red-400" />;
    }
  };

  const getBgColor = () => {
    switch (check.status) {
      case 'pass':
        return 'bg-green-900/20 border-green-700';
      case 'warning':
        return 'bg-amber-900/20 border-amber-700';
      case 'blocked':
        return 'bg-red-900/20 border-red-700';
    }
  };

  const getTextColor = () => {
    switch (check.status) {
      case 'pass':
        return 'text-green-300';
      case 'warning':
        return 'text-amber-300';
      case 'blocked':
        return 'text-red-300';
    }
  };

  return (
    <div className={`border rounded-2xl p-3 ${getBgColor()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-slate-100 mb-1">
            {check.field}
          </div>
          <div className={`text-[12px] ${getTextColor()} mb-2`}>
            {check.message}
          </div>
          {check.fixAction && check.status !== 'pass' && (
            <button
              onClick={onFix}
              className="text-[12px] text-blue-400 hover:text-blue-300 font-semibold"
            >
              Fix: {check.fixAction} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
