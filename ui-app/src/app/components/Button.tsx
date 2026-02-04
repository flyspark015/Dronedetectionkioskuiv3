interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  disabled = false,
  fullWidth = false,
  icon 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-3xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-[14px] min-h-[48px]',
    md: 'px-6 py-3 text-[16px] min-h-[56px]',
    lg: 'px-8 py-4 text-[18px] min-h-[64px]'
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 shadow-md',
    secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-800 border border-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-md',
    warning: 'bg-amber-600 text-white hover:bg-amber-500 active:bg-amber-700 shadow-md'
  };

  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <button
      type="button"
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
