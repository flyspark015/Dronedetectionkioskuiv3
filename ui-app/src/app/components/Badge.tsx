interface BadgeProps {
  label: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type?: 'REMOTE_ID' | 'FPV_LINK' | 'UNKNOWN_RF';
}

export function Badge({ label, severity, type }: BadgeProps) {
  const baseClasses = 'inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide';

  let colorClasses = '';
  
  if (severity) {
    const severityColors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-amber-500 text-slate-900',
      low: 'bg-blue-500 text-white',
      info: 'bg-slate-600 text-slate-100'
    };
    colorClasses = severityColors[severity];
  } else if (type) {
    const typeColors = {
      'REMOTE_ID': 'bg-purple-600/90 text-purple-100',
      'FPV_LINK': 'bg-pink-600/90 text-pink-100',
      'UNKNOWN_RF': 'bg-slate-600 text-slate-200'
    };
    colorClasses = typeColors[type];
  }

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      {label}
    </span>
  );
}