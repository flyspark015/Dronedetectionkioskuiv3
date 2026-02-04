/**
 * Sort Toggle Component
 * 
 * Allows operators to change contact sorting mode
 */

import { ArrowUpDown } from 'lucide-react';
import type { SortMode } from '@/app/utils/contact-sorting';
import { getSortModeLabel } from '@/app/utils/contact-sorting';

export interface SortToggleProps {
  mode: SortMode;
  onModeChange: (mode: SortMode) => void;
  disabled?: boolean;
}

const SORT_MODES: SortMode[] = ['severity', 'nearest', 'lastSeen'];

export function SortToggle({ mode, onModeChange, disabled }: SortToggleProps) {
  const currentIndex = SORT_MODES.indexOf(mode);
  
  const handleToggle = () => {
    if (disabled) return;
    const nextIndex = (currentIndex + 1) % SORT_MODES.length;
    onModeChange(SORT_MODES[nextIndex]);
  };
  
  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-sm font-medium text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
    >
      <ArrowUpDown size={16} />
      <span>Sort: {getSortModeLabel(mode)}</span>
    </button>
  );
}
