interface PresetChipsProps {
  label: string;
  options: Array<{ label: string; value: any }>;
  value: any;
  onChange: (value: any) => void;
  helpText?: string;
}

export function PresetChips({ label, options, value, onChange, helpText }: PresetChipsProps) {
  return (
    <div className="space-y-2">
      <span className="text-[15px] text-slate-300 font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors min-h-[56px] focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
              value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {helpText && (
        <div className="text-[12px] text-slate-500 mt-1">
          {helpText}
        </div>
      )}
    </div>
  );
}
