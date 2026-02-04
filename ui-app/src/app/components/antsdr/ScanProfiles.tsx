import { useState, useEffect } from 'react';
import { ChevronLeft, Save, Copy, RotateCcw, Download, Upload, AlertTriangle } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { rfScanAction } from '@/app/services/settings';

interface ScanProfilesProps {
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function ScanProfiles({ onBack, onDirtyChange }: ScanProfilesProps) {
  const [activeProfile, setActiveProfile] = useState<'fast' | 'balanced' | 'high-coverage' | 'custom'>('balanced');
  const [isDirty, setIsDirty] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // Mock validation - would come from actual config
  useEffect(() => {
    // Simulate validation check
    const issues: string[] = [];
    if (activeProfile === 'custom') {
      // Mock: check if sweep plan has issues
      issues.push('Sweep Plan "VTX_58": Step size exceeds sample rate');
      issues.push('TTL too short for sweep cycle time');
    }
    setValidationIssues(issues);
  }, [activeProfile]);

  const handleProfileChange = (profile: typeof activeProfile) => {
    setActiveProfile(profile);
    setIsDirty(true);
  };

  const handleSaveProfile = async () => {
    const res = await rfScanAction('scan_profiles_save', { profile: activeProfile });
    if (!res.ok) {
      alert('Not supported in this build');
      return;
    }
    setIsDirty(false);
  };

  const handleDuplicateProfile = async () => {
    const res = await rfScanAction('scan_profiles_duplicate', { profile: activeProfile });
    if (!res.ok) {
      alert('Not supported in this build');
    }
  };

  const handleResetToDefault = () => {
    const confirmed = window.confirm('Reset to default profile settings?');
    if (confirmed) {
      rfScanAction('scan_profiles_reset', { profile: activeProfile }).then((res) => {
        if (!res.ok) {
          alert('Not supported in this build');
          return;
        }
        setIsDirty(false);
      });
    }
  };

  const handleExportJSON = async () => {
    const res = await rfScanAction('scan_profiles_export', { format: 'json' });
    if (!res.ok) {
      alert('Not supported in this build');
    }
  };

  const handleExportYAML = async () => {
    const res = await rfScanAction('scan_profiles_export', { format: 'yaml' });
    if (!res.ok) {
      alert('Not supported in this build');
    }
  };

  const handleImport = async () => {
    const res = await rfScanAction('scan_profiles_import');
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
        <h2 className="text-[16px] font-semibold text-slate-100 flex-1">Scan Profiles</h2>
        {isDirty && (
          <span className="text-[12px] text-amber-400 font-semibold">Unsaved</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-panel p-4 space-y-4">
        {/* Validation Banner */}
        {validationIssues.length > 0 && (
          <div className="bg-red-900/30 border border-red-600 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[14px] text-red-200 font-semibold mb-2">
                  Configuration Issues ({validationIssues.length})
                </div>
                <div className="space-y-1">
                  {validationIssues.map((issue, idx) => (
                    <div key={idx} className="text-[12px] text-red-300">
                      • {issue}
                    </div>
                  ))}
                </div>
                <button className="mt-3 text-[12px] text-red-200 font-semibold hover:text-red-100">
                  Fix Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Scan Profile */}
        <Card>
          <div className="space-y-3">
            <div className="text-[14px] text-slate-300 font-medium mb-3">Active Scan Profile</div>
            <div className="grid grid-cols-2 gap-2">
              <ProfileButton
                label="Fast"
                description="Quick sweep, lower coverage"
                active={activeProfile === 'fast'}
                onClick={() => handleProfileChange('fast')}
              />
              <ProfileButton
                label="Balanced"
                description="Good speed + coverage"
                active={activeProfile === 'balanced'}
                onClick={() => handleProfileChange('balanced')}
              />
              <ProfileButton
                label="High Coverage"
                description="Thorough, slower sweep"
                active={activeProfile === 'high-coverage'}
                onClick={() => handleProfileChange('high-coverage')}
              />
              <ProfileButton
                label="Custom"
                description="User-defined settings"
                active={activeProfile === 'custom'}
                onClick={() => handleProfileChange('custom')}
              />
            </div>
          </div>
        </Card>

        {/* Profile Actions */}
        <Card>
          <div className="space-y-2">
            <div className="text-[14px] text-slate-300 font-medium mb-3">Profile Actions</div>
            <Button
              size="md"
              variant="primary"
              icon={<Save size={16} />}
              onClick={handleSaveProfile}
              fullWidth
              disabled={!isDirty}
            >
              Save Profile
            </Button>
            <Button
              size="md"
              variant="secondary"
              icon={<Copy size={16} />}
              onClick={handleDuplicateProfile}
              fullWidth
            >
              Duplicate Profile
            </Button>
            <Button
              size="md"
              variant="secondary"
              icon={<RotateCcw size={16} />}
              onClick={handleResetToDefault}
              fullWidth
            >
              Reset to Default
            </Button>
          </div>
        </Card>

        {/* Import/Export */}
        <Card>
          <div className="space-y-2">
            <div className="text-[14px] text-slate-300 font-medium mb-3">Import / Export</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="md"
                variant="secondary"
                icon={<Download size={16} />}
                onClick={handleExportJSON}
                fullWidth
              >
                Export JSON
              </Button>
              <Button
                size="md"
                variant="secondary"
                icon={<Download size={16} />}
                onClick={handleExportYAML}
                fullWidth
              >
                Export YAML
              </Button>
            </div>
            <Button
              size="md"
              variant="secondary"
              icon={<Upload size={16} />}
              onClick={handleImport}
              fullWidth
            >
              Import Config
            </Button>
          </div>
        </Card>

        {/* Profile Info */}
        <Card>
          <div className="space-y-2">
            <div className="text-[14px] text-slate-300 font-medium mb-2">Profile Information</div>
            <InfoRow label="Last Applied" value="2 minutes ago" />
            <InfoRow label="Total Sweep Plans" value="4 enabled" />
            <InfoRow label="Estimated Cycle Time" value="~2.4s" />
            <InfoRow label="Configuration Status" value={validationIssues.length > 0 ? 'Invalid' : 'Valid'} />
          </div>
        </Card>
      </div>
    </div>
  );
}

interface ProfileButtonProps {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function ProfileButton({ label, description, active, onClick }: ProfileButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-2xl text-left transition-colors min-h-[72px] ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-slate-600'
      }`}
    >
      <div className={`text-[14px] font-semibold mb-1 ${active ? 'text-white' : 'text-slate-100'}`}>
        {label}
      </div>
      <div className={`text-[11px] ${active ? 'text-blue-100' : 'text-slate-400'}`}>
        {description}
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-4 text-[13px]">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}
