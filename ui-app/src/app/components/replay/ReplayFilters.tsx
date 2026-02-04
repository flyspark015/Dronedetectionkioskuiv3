import { useState } from 'react';
import { Search } from 'lucide-react';
import { Chip } from '@/app/components/Chip';

interface ReplayFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showRaw: boolean;
  showDecoded: boolean;
  showErrors: boolean;
  showStats: boolean;
  onToggleRaw: () => void;
  onToggleDecoded: () => void;
  onToggleErrors: () => void;
  onToggleStats: () => void;
  activeTypes: string[];
  onToggleType: (type: string) => void;
  onlyDecoded: boolean;
  onToggleOnlyDecoded: () => void;
}

const eventTypes = [
  { id: 'basic-id', label: 'BasicID' },
  { id: 'location', label: 'Location' },
  { id: 'self-id', label: 'SelfID' },
  { id: 'system', label: 'System' },
  { id: 'operator-id', label: 'OperatorID' }
];

export function ReplayFilters({
  searchQuery,
  onSearchChange,
  showRaw,
  showDecoded,
  showErrors,
  showStats,
  onToggleRaw,
  onToggleDecoded,
  onToggleErrors,
  onToggleStats,
  activeTypes,
  onToggleType,
  onlyDecoded,
  onToggleOnlyDecoded
}: ReplayFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search ID, serial, operator, MAC, keyword..."
          className="w-full h-12 pl-11 pr-4 bg-slate-800 border border-slate-700 rounded-2xl text-[14px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>
      
      {/* View Toggles */}
      <div>
        <div className="text-[11px] text-slate-400 mb-2 font-medium">Display</div>
        <div className="flex flex-wrap gap-2 chips-scroll">
          <Chip label="Raw" active={showRaw} onClick={onToggleRaw} />
          <Chip label="Decoded" active={showDecoded} onClick={onToggleDecoded} />
          <Chip label="Errors" active={showErrors} onClick={onToggleErrors} />
          <Chip label="Stats" active={showStats} onClick={onToggleStats} />
        </div>
      </div>
      
      {/* Event Type Filters */}
      <div>
        <div className="text-[11px] text-slate-400 mb-2 font-medium">Event Types</div>
        <div className="flex flex-wrap gap-2 chips-scroll">
          {eventTypes.map(type => (
            <Chip
              key={type.id}
              label={type.label}
              active={activeTypes.includes(type.id)}
              onClick={() => onToggleType(type.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Decoded Only Toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyDecoded}
            onChange={onToggleOnlyDecoded}
            className="w-5 h-5 bg-slate-700 border-2 border-slate-600 rounded accent-blue-600"
          />
          <span className="text-[14px] text-slate-300">Only show decoded contacts</span>
        </label>
      </div>
    </div>
  );
}
