import { useState } from 'react';

interface FrequencyInputProps {
  label: string;
  value: number; // Always stored in Hz
  onChange: (value: number) => void;
  helpText?: string;
  error?: string;
}

export function FrequencyInput({ label, value, onChange, helpText, error }: FrequencyInputProps) {
  const [unit, setUnit] = useState<'Hz' | 'MHz'>('MHz');
  
  const displayValue = unit === 'MHz' ? (value / 1_000_000).toFixed(3) : value.toString();

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numValue = parseFloat(inputValue);
    
    if (!isNaN(numValue)) {
      const hzValue = unit === 'MHz' ? numValue * 1_000_000 : numValue;
      onChange(hzValue);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-[14px] text-slate-300 font-medium">{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          value={displayValue}
          onChange={handleValueChange}
          step={unit === 'MHz' ? '0.001' : '1'}
          className={`flex-1 px-3 py-2.5 text-[14px] bg-slate-800 border rounded-xl text-slate-100 focus:outline-none min-h-[48px] ${
            error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
          }`}
        />
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 border border-slate-600">
          <button
            onClick={() => setUnit('Hz')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors min-w-[48px] ${
              unit === 'Hz' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            Hz
          </button>
          <button
            onClick={() => setUnit('MHz')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors min-w-[48px] ${
              unit === 'MHz' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            MHz
          </button>
        </div>
      </div>
      {error && (
        <div className="text-[12px] text-red-400 flex items-start gap-1">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
      {helpText && !error && (
        <div className="text-[12px] text-slate-500">
          {helpText}
        </div>
      )}
    </div>
  );
}
