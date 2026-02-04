interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, onClick, className = '' }: CardProps) {
  const baseClasses = 'bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-sm transition-all';
  const clickableClasses = onClick ? 'cursor-pointer hover:bg-slate-750 hover:border-slate-600 active:scale-98' : '';

  return (
    <div 
      className={`${baseClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}