interface ChipProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function Chip({ label, variant = 'default', active = false, onClick, size = 'md' }: ChipProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';
  
  // Ensure touch-safe minimum heights (48px for md, 44px for sm)
  const sizeClasses = {
    sm: 'px-3 py-2 text-[11px] min-h-[48px]',
    md: 'px-4 py-2.5 text-[13px] min-h-[56px]'
  };

  const variantClasses = {
    default: active 
      ? 'bg-slate-600 text-slate-100 border border-slate-500 shadow-sm' 
      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600',
    success: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40',
    warning: 'bg-amber-600/20 text-amber-400 border border-amber-600/40',
    danger: 'bg-red-600/20 text-red-400 border border-red-600/40',
    info: 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
  };

  const clickableClasses = onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : '';

  return (
    <button
      type="button"
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${clickableClasses}`}
      onClick={onClick}
      disabled={!onClick}
    >
      {label}
    </button>
  );
}
