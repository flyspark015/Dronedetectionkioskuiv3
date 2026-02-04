import { useState } from 'react';
import { ChevronRight, Radio } from 'lucide-react';
import { Card } from '../Card';
import { ScanProfiles } from './ScanProfiles';
import { SweepPlans } from './SweepPlans';
import { Detection } from './Detection';
import { Tracking } from './Tracking';
import { Classification } from './Classification';
import { OutputLogging } from './OutputLogging';
import { HealthDiagnostics } from './HealthDiagnostics';
import { SafetyValidation } from './SafetyValidation';

type RfScanPage = 
  | 'main'
  | 'profiles'
  | 'sweep-plans'
  | 'detection'
  | 'tracking'
  | 'classification'
  | 'output'
  | 'health'
  | 'safety';

interface RfScanSettingsProps {
  onBack?: () => void;
}

export function RfScanSettings({ onBack }: RfScanSettingsProps) {
  const [currentPage, setCurrentPage] = useState<RfScanPage>('main');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleNavigate = (page: RfScanPage) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Continue?');
      if (!confirmed) return;
    }
    setCurrentPage(page);
  };

  const handleBack = () => {
    if (currentPage === 'main') {
      onBack?.();
    } else {
      handleNavigate('main');
    }
  };

  // Render submenu
  if (currentPage === 'main') {
    return (
      <div className="h-full overflow-y-auto scroll-panel p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-slate-100 flex items-center gap-2">
            <Radio size={20} />
            RF Scanning (Advanced)
          </h2>
        </div>

        <Card>
          <div className="space-y-1">
            <MenuItem
              label="Scan Profiles"
              description="Fast, Balanced, High Coverage, Custom"
              onClick={() => handleNavigate('profiles')}
            />
            <MenuItem
              label="Sweep Plans"
              description="Band plan editor with frequency ranges"
              onClick={() => handleNavigate('sweep-plans')}
            />
            <MenuItem
              label="Detection"
              description="Peak detector settings"
              onClick={() => handleNavigate('detection')}
            />
            <MenuItem
              label="Tracking"
              description="Contact tracker configuration"
              onClick={() => handleNavigate('tracking')}
            />
            <MenuItem
              label="Classification"
              description="Signal classification mode"
              onClick={() => handleNavigate('classification')}
            />
            <MenuItem
              label="Output & Logging"
              description="Log level and output format"
              onClick={() => handleNavigate('output')}
            />
            <MenuItem
              label="Health & Diagnostics"
              description="Connection status and metrics"
              onClick={() => handleNavigate('health')}
            />
            <MenuItem
              label="Safety & Validation"
              description="Preflight checks and warnings"
              onClick={() => handleNavigate('safety')}
              highlight
            />
          </div>
        </Card>

        {hasUnsavedChanges && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-2xl p-4">
            <div className="text-[14px] text-amber-200 font-semibold mb-1">
              Unsaved Changes
            </div>
            <div className="text-[12px] text-amber-300">
              Configuration changes pending. Go to Safety & Validation to review and apply.
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render subpages
  return (
    <div className="h-full flex flex-col">
      {currentPage === 'profiles' && (
        <ScanProfiles 
          onBack={handleBack}
          onDirtyChange={setHasUnsavedChanges}
        />
      )}
      {currentPage === 'sweep-plans' && (
        <SweepPlans 
          onBack={handleBack}
          onDirtyChange={setHasUnsavedChanges}
        />
      )}
      {currentPage === 'detection' && (
        <Detection 
          onBack={handleBack}
          onDirtyChange={setHasUnsavedChanges}
        />
      )}
      {currentPage === 'tracking' && (
        <Tracking 
          onBack={handleBack}
          onDirtyChange={setHasUnsavedChanges}
        />
      )}
      {currentPage === 'classification' && (
        <Classification 
          onBack={handleBack}
          onDirtyChange={setHasUnsavedChanges}
        />
      )}
      {currentPage === 'output' && (
        <OutputLogging 
          onBack={handleBack}
          onDirtyChange={setHasUnsavedChanges}
        />
      )}
      {currentPage === 'health' && (
        <HealthDiagnostics onBack={handleBack} />
      )}
      {currentPage === 'safety' && (
        <SafetyValidation onBack={handleBack} />
      )}
    </div>
  );
}

interface MenuItemProps {
  label: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}

function MenuItem({ label, description, onClick, highlight }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors min-h-[64px] ${
        highlight
          ? 'bg-blue-900/30 hover:bg-blue-900/40 active:bg-blue-900/50 border border-blue-700'
          : 'hover:bg-slate-800 active:bg-slate-700'
      }`}
    >
      <div className="flex-1 text-left">
        <div className={`text-[14px] font-semibold mb-1 ${
          highlight ? 'text-blue-300' : 'text-slate-100'
        }`}>
          {label}
        </div>
        <div className="text-[12px] text-slate-400">
          {description}
        </div>
      </div>
      <ChevronRight size={20} className={highlight ? 'text-blue-400' : 'text-slate-400'} />
    </button>
  );
}
