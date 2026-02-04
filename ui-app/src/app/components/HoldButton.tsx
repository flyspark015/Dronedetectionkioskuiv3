import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface HoldButtonProps {
  label: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  holdDuration?: number;
  onComplete: () => void;
  fullWidth?: boolean;
}

export function HoldButton({
  label,
  icon,
  variant = 'danger',
  size = 'sm',
  holdDuration = 2000,
  onComplete,
  fullWidth = false
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStart = () => {
    setIsHolding(true);
    startTimeRef.current = Date.now();
    
    // Update progress
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Complete action when hold duration reached
    holdTimerRef.current = setTimeout(() => {
      onComplete();
      handleEnd();
    }, holdDuration);
  };

  const handleEnd = () => {
    setIsHolding(false);
    setProgress(0);
    
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <div
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        className={fullWidth ? 'w-full' : ''}
      >
        <Button
          size={size}
          variant={variant}
          icon={icon}
          fullWidth={fullWidth}
          onClick={() => {}} // Prevent default click
        >
          {isHolding ? 'Hold...' : label}
        </Button>
      </div>
      
      {/* Progress bar */}
      {isHolding && (
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-700 rounded-b-3xl overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
