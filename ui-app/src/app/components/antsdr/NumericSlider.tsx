import { useState } from 'react';

interface NumericSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  helpText?: string;
  warningThreshold?: number;
  warningMessage?: string;
}

export function NumericSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  helpText,
  warningThreshold,
  warningMessage
}: NumericSliderProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    onChange(newValue);
    setInputValue(newValue.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = Number(inputValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setInputValue(clampedValue.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const showWarning = warningThreshold !== undefined && value >= warningThreshold;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[14px] text-slate-300 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsEditing(true)}
            onBlur={handleInputBlur}
            className="w-20 px-2 py-1 text-[14px] text-right bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
          />
          {unit && <span className="text-[14px] text-slate-400">{unit}</span>}
        </div>
      </div>
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="w-full h-3 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-600"
        style={{
          background: `linear-gradient(to right, rgb(37 99 235) 0%, rgb(37 99 235) ${((value - min) / (max - min)) * 100}%, rgb(51 65 85) ${((value - min) / (max - min)) * 100}%, rgb(51 65 85) 100%)`
        }}
      />
      
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>

      {helpText && !showWarning && (
        <div className="text-[12px] text-slate-500 mt-1">
          {helpText}
        </div>
      )}

      {showWarning && warningMessage && (
        <div className="text-[12px] text-amber-400 mt-1 flex items-start gap-1">
          <span className="text-amber-400">⚠</span>
          <span>{warningMessage}</span>
        </div>
      )}
    </div>
  );
}
