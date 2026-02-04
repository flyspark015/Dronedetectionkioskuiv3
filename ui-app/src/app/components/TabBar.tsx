import { Home, Bell, FileText, Settings } from 'lucide-react';

interface TabBarProps {
  activeTab: 'home' | 'alerts' | 'logs' | 'settings';
  onTabChange: (tab: 'home' | 'alerts' | 'logs' | 'settings') => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'alerts' as const, label: 'Alerts', icon: Bell },
    { id: 'logs' as const, label: 'Logs', icon: FileText },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 shadow-lg">
      <div className="flex items-center justify-around px-2 py-2" style={{ minHeight: 'var(--tab-bar-height)' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl min-w-[72px] transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:scale-95'
              }`}
              style={{ minHeight: 'var(--touch-comfortable)' }}
            >
              <Icon size={22} strokeWidth={2.5} />
              <span className="font-semibold" style={{ fontSize: 'var(--font-micro)' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}