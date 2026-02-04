import { Wifi, WifiOff, Globe, Maximize, Target, Maximize2, Locate, Plus, Minus, Navigation, Minimize, ChevronDown } from 'lucide-react';

export function MapDemoFrames() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-[1600px] mx-auto space-y-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-[32px] font-bold text-slate-100 mb-2">N-Defender Map Controls</h1>
          <p className="text-[16px] text-slate-400">Portrait & Landscape • Normal & Fullscreen States</p>
        </div>

        {/* Portrait Layouts */}
        <div className="space-y-8">
          <h2 className="text-[24px] font-bold text-slate-100 mb-4">Portrait Orientation (7-inch Display)</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Portrait - Normal State with Mid Drawer */}
            <div className="space-y-3">
              <h3 className="text-[16px] font-semibold text-blue-400">Normal • Drawer Mid-Snap</h3>
              <div className="relative w-full aspect-[9/16] bg-slate-900 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-[52px] bg-slate-950 border-b border-slate-700 flex items-center justify-between px-4 z-50">
                  <div className="text-[14px] font-bold text-slate-100">N-DEFENDER</div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>

                {/* Map Area */}
                <div className="absolute inset-0 pt-[52px] pb-[76px] bg-slate-900">
                  {/* Map HUD - top-left */}
                  <div className="absolute top-[64px] left-3 bg-slate-900/95 rounded-2xl px-3 py-2 border border-slate-700 shadow-lg text-[11px] space-y-1">
                    <div><span className="text-slate-400">RID:</span> <span className="text-blue-400 font-bold">2</span></div>
                    <div><span className="text-slate-400">Telem:</span> <span className="text-slate-300">2s</span></div>
                    <div><span className="text-slate-400">GPS:</span> <span className="text-green-400">1.2m</span></div>
                  </div>

                  {/* Compass - top-right */}
                  <div className="absolute top-[64px] right-3 bg-slate-900/95 rounded-2xl p-3 border border-slate-700 shadow-lg">
                    <Navigation size={20} className="text-slate-400" />
                  </div>

                  {/* Scan State */}
                  <div className="absolute top-[140px] left-3 bg-slate-900/95 rounded-2xl px-3 py-1.5 border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-[11px] font-semibold text-slate-100">SCANNING</span>
                    </div>
                  </div>

                  {/* Map Mode Controls - bottom-left */}
                  <div className="absolute bottom-[220px] left-3 bg-slate-900/95 rounded-2xl p-1 border border-slate-700 shadow-lg flex gap-1">
                    <div className="px-2 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-medium min-h-[40px] flex items-center">
                      <Wifi size={12} />
                    </div>
                    <div className="px-2 py-2 rounded-xl text-slate-300 text-[10px] font-medium min-h-[40px] flex items-center">
                      <WifiOff size={12} />
                    </div>
                    <div className="px-2 py-2 rounded-xl text-slate-300 text-[10px] font-medium min-h-[40px] flex items-center">
                      <Globe size={12} />
                    </div>
                  </div>

                  {/* Map Tool Stack - right side */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    <div className="absolute inset-0 bg-slate-950/40 rounded-3xl blur-xl -z-10" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Maximize size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center opacity-40">
                      <Target size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Maximize2 size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Locate size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Plus size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Minus size={16} />
                    </button>
                  </div>

                  {/* Draggable Drawer - Mid Snap (50%) */}
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl border-t border-slate-700 shadow-2xl" style={{ height: '50%' }}>
                    <div className="px-4 py-3">
                      <div className="flex justify-center mb-2">
                        <div className="w-10 h-1 bg-slate-600 rounded-full" />
                      </div>
                      <div className="flex items-center justify-between">
                        <h2 className="text-[14px] font-semibold text-slate-100">Contacts (6)</h2>
                        <ChevronDown size={18} className="text-slate-300" />
                      </div>
                    </div>
                    <div className="px-3 pt-2 space-y-2">
                      {/* Contact card samples */}
                      <div className="bg-slate-800 rounded-2xl p-3 border-l-4 border-red-500">
                        <div className="text-[12px] font-semibold text-slate-100">DJI Mavic 3</div>
                        <div className="text-[10px] text-slate-400 mt-1">245m • 142°</div>
                      </div>
                      <div className="bg-slate-800 rounded-2xl p-3 border-l-4 border-amber-500">
                        <div className="text-[12px] font-semibold text-slate-100">FPV • 5860 MHz</div>
                        <div className="text-[10px] text-slate-400 mt-1">LOCKED • -68 dBm</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[76px] bg-slate-950 border-t border-slate-700 flex items-center justify-around z-50">
                  <div className="text-[11px] text-blue-400 font-semibold">Home</div>
                  <div className="text-[11px] text-slate-400">Alerts</div>
                  <div className="text-[11px] text-slate-400">Logs</div>
                  <div className="text-[11px] text-slate-400">Settings</div>
                </div>
              </div>
            </div>

            {/* Portrait - Fullscreen Map */}
            <div className="space-y-3">
              <h3 className="text-[16px] font-semibold text-blue-400">Fullscreen Map Mode</h3>
              <div className="relative w-full aspect-[9/16] bg-slate-950 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-[52px] bg-slate-950 border-b border-slate-700 flex items-center justify-between px-4 z-50">
                  <div className="text-[14px] font-bold text-slate-100">N-DEFENDER</div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>

                {/* Map Area - Fullscreen */}
                <div className="absolute inset-0 pt-[52px] pb-[72px] bg-slate-950">
                  {/* Map HUD */}
                  <div className="absolute top-[64px] left-3 bg-slate-900/95 rounded-2xl px-3 py-2 border border-slate-700 shadow-lg text-[11px] space-y-1">
                    <div><span className="text-slate-400">RID:</span> <span className="text-blue-400 font-bold">2</span></div>
                    <div><span className="text-slate-400">Telem:</span> <span className="text-slate-300">2s</span></div>
                    <div><span className="text-slate-400">GPS:</span> <span className="text-green-400">1.2m</span></div>
                  </div>

                  {/* Compass */}
                  <div className="absolute top-[64px] right-3 bg-slate-900/95 rounded-2xl p-3 border border-slate-700 shadow-lg">
                    <Navigation size={20} className="text-slate-400" />
                  </div>

                  {/* Scan State */}
                  <div className="absolute top-[140px] left-3 bg-slate-900/95 rounded-2xl px-3 py-1.5 border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-[11px] font-semibold text-slate-100">SCANNING</span>
                    </div>
                  </div>

                  {/* Map Tool Stack - positioned below scan state */}
                  <div className="absolute right-3 top-[180px] flex flex-col gap-2">
                    <div className="absolute inset-0 bg-slate-950/40 rounded-3xl blur-xl -z-10" />
                    <button className="w-12 h-12 bg-slate-900/95 text-blue-400 rounded-xl border border-blue-600 shadow-lg flex items-center justify-center">
                      <Maximize size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center opacity-40">
                      <Target size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Maximize2 size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Locate size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Plus size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Minus size={16} />
                    </button>
                  </div>

                  {/* Fullscreen Map Bar - collapsed drawer peek */}
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 shadow-2xl flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <ChevronDown size={16} className="text-slate-400 rotate-180" />
                      <span className="text-[12px] font-semibold text-slate-100">Contacts (6)</span>
                      <span className="text-[11px] text-slate-400">• Pull up</span>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[12px] font-semibold">
                      <Minimize size={14} />
                      Exit Fullscreen
                    </button>
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[76px] bg-slate-950 border-t border-slate-700 flex items-center justify-around z-50">
                  <div className="text-[11px] text-blue-400 font-semibold">Home</div>
                  <div className="text-[11px] text-slate-400">Alerts</div>
                  <div className="text-[11px] text-slate-400">Logs</div>
                  <div className="text-[11px] text-slate-400">Settings</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Landscape Layouts */}
        <div className="space-y-8">
          <h2 className="text-[24px] font-bold text-slate-100 mb-4">Landscape Orientation (7-inch Display)</h2>
          
          <div className="grid grid-cols-1 gap-8">
            {/* Landscape - Normal State */}
            <div className="space-y-3">
              <h3 className="text-[16px] font-semibold text-blue-400">Normal • Drawer Mid-Snap</h3>
              <div className="relative w-full aspect-[16/9] bg-slate-900 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-[52px] bg-slate-950 border-b border-slate-700 flex items-center justify-between px-4 z-50">
                  <div className="text-[14px] font-bold text-slate-100">N-DEFENDER</div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>

                {/* Map Area */}
                <div className="absolute inset-0 pt-[52px] pb-[76px] bg-slate-900">
                  {/* Map HUD */}
                  <div className="absolute top-[64px] left-3 bg-slate-900/95 rounded-2xl px-3 py-2 border border-slate-700 shadow-lg text-[11px] space-y-1">
                    <div><span className="text-slate-400">RID:</span> <span className="text-blue-400 font-bold">2</span></div>
                    <div><span className="text-slate-400">Telem:</span> <span className="text-slate-300">2s</span></div>
                    <div><span className="text-slate-400">GPS:</span> <span className="text-green-400">1.2m</span></div>
                  </div>

                  {/* Compass */}
                  <div className="absolute top-[64px] right-3 bg-slate-900/95 rounded-2xl p-3 border border-slate-700 shadow-lg">
                    <Navigation size={20} className="text-slate-400" />
                  </div>

                  {/* Scan State */}
                  <div className="absolute top-[140px] left-3 bg-slate-900/95 rounded-2xl px-3 py-1.5 border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-[11px] font-semibold text-slate-100">SCANNING</span>
                    </div>
                  </div>

                  {/* Map Mode Controls */}
                  <div className="absolute bottom-[220px] left-3 bg-slate-900/95 rounded-2xl p-1 border border-slate-700 shadow-lg flex gap-1">
                    <div className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-medium min-h-[40px] flex items-center gap-1">
                      <Wifi size={12} />
                      <span>Online</span>
                    </div>
                    <div className="px-3 py-2 rounded-xl text-slate-300 text-[10px] font-medium min-h-[40px] flex items-center gap-1">
                      <WifiOff size={12} />
                      <span>Offline</span>
                    </div>
                    <div className="px-3 py-2 rounded-xl text-slate-300 text-[10px] font-medium min-h-[40px] flex items-center gap-1">
                      <Globe size={12} />
                      <span>Auto</span>
                    </div>
                  </div>

                  {/* Map Tool Stack */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    <div className="absolute inset-0 bg-slate-950/40 rounded-3xl blur-xl -z-10" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Maximize size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center opacity-40">
                      <Target size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Maximize2 size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Locate size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Plus size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Minus size={16} />
                    </button>
                  </div>

                  {/* Draggable Drawer - Landscape takes more horizontal space */}
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl border-t border-slate-700 shadow-2xl" style={{ height: '40%' }}>
                    <div className="px-4 py-3">
                      <div className="flex justify-center mb-2">
                        <div className="w-10 h-1 bg-slate-600 rounded-full" />
                      </div>
                      <div className="flex items-center justify-between">
                        <h2 className="text-[14px] font-semibold text-slate-100">Contacts (6)</h2>
                        <ChevronDown size={18} className="text-slate-300" />
                      </div>
                    </div>
                    <div className="px-3 pt-2 grid grid-cols-2 gap-2">
                      {/* Contact cards in grid for landscape */}
                      <div className="bg-slate-800 rounded-2xl p-3 border-l-4 border-red-500">
                        <div className="text-[12px] font-semibold text-slate-100">DJI Mavic 3</div>
                        <div className="text-[10px] text-slate-400 mt-1">245m • 142°</div>
                      </div>
                      <div className="bg-slate-800 rounded-2xl p-3 border-l-4 border-amber-500">
                        <div className="text-[12px] font-semibold text-slate-100">FPV • 5860 MHz</div>
                        <div className="text-[10px] text-slate-400 mt-1">LOCKED • -68 dBm</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[76px] bg-slate-950 border-t border-slate-700 flex items-center justify-around z-50">
                  <div className="text-[11px] text-blue-400 font-semibold">Home</div>
                  <div className="text-[11px] text-slate-400">Alerts</div>
                  <div className="text-[11px] text-slate-400">Logs</div>
                  <div className="text-[11px] text-slate-400">Settings</div>
                </div>
              </div>
            </div>

            {/* Landscape - Fullscreen */}
            <div className="space-y-3">
              <h3 className="text-[16px] font-semibold text-blue-400">Fullscreen Map Mode</h3>
              <div className="relative w-full aspect-[16/9] bg-slate-950 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-[52px] bg-slate-950 border-b border-slate-700 flex items-center justify-between px-4 z-50">
                  <div className="text-[14px] font-bold text-slate-100">N-DEFENDER</div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>

                {/* Map Area - Fullscreen */}
                <div className="absolute inset-0 pt-[52px] pb-[72px] bg-slate-950">
                  {/* Map HUD */}
                  <div className="absolute top-[64px] left-3 bg-slate-900/95 rounded-2xl px-3 py-2 border border-slate-700 shadow-lg text-[11px] space-y-1">
                    <div><span className="text-slate-400">RID:</span> <span className="text-blue-400 font-bold">2</span></div>
                    <div><span className="text-slate-400">Telem:</span> <span className="text-slate-300">2s</span></div>
                    <div><span className="text-slate-400">GPS:</span> <span className="text-green-400">1.2m</span></div>
                  </div>

                  {/* Compass */}
                  <div className="absolute top-[64px] right-3 bg-slate-900/95 rounded-2xl p-3 border border-slate-700 shadow-lg">
                    <Navigation size={20} className="text-slate-400" />
                  </div>

                  {/* Scan State */}
                  <div className="absolute top-[140px] left-3 bg-slate-900/95 rounded-2xl px-3 py-1.5 border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-[11px] font-semibold text-slate-100">SCANNING</span>
                    </div>
                  </div>

                  {/* Map Tool Stack */}
                  <div className="absolute right-3 top-[180px] flex flex-col gap-2">
                    <div className="absolute inset-0 bg-slate-950/40 rounded-3xl blur-xl -z-10" />
                    <button className="w-12 h-12 bg-slate-900/95 text-blue-400 rounded-xl border border-blue-600 shadow-lg flex items-center justify-center">
                      <Maximize size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center opacity-40">
                      <Target size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Maximize2 size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Locate size={16} />
                    </button>
                    <div className="h-px bg-slate-700/50 mx-2" />
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Plus size={16} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900/95 text-slate-200 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center">
                      <Minus size={16} />
                    </button>
                  </div>

                  {/* Fullscreen Map Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 shadow-2xl flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ChevronDown size={16} className="text-slate-400 rotate-180" />
                      <span className="text-[12px] font-semibold text-slate-100">Contacts (6)</span>
                      <span className="text-[11px] text-slate-400">• Pull up</span>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-semibold">
                      <Minimize size={14} />
                      Exit Fullscreen
                    </button>
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[76px] bg-slate-950 border-t border-slate-700 flex items-center justify-around z-50">
                  <div className="text-[11px] text-blue-400 font-semibold">Home</div>
                  <div className="text-[11px] text-slate-400">Alerts</div>
                  <div className="text-[11px] text-slate-400">Logs</div>
                  <div className="text-[11px] text-slate-400">Settings</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Summary */}
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-700">
          <h3 className="text-[20px] font-bold text-slate-100 mb-4">Map Control Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[14px]">
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Right-Side Tool Stack</h4>
              <ul className="space-y-1 text-slate-300">
                <li>• Fullscreen Map toggle</li>
                <li>• Focus Selected (Target icon)</li>
                <li>• Fit to Markers (Maximize2 icon)</li>
                <li>• Center on Me (GPS)</li>
                <li>• Zoom +/− controls</li>
                <li>• Smart disable states</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Map Controls</h4>
              <ul className="space-y-1 text-slate-300">
                <li>• Compass/North-up (top-right)</li>
                <li>• Map HUD (RID count, telemetry, GPS)</li>
                <li>• Mode chips: Online/Offline/Auto</li>
                <li>• Scan state indicator</li>
                <li>• Selected contact overlay</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Fullscreen Behavior</h4>
              <ul className="space-y-1 text-slate-300">
                <li>• Map expands to full viewport</li>
                <li>• Drawer collapses to peek strip</li>
                <li>• Exit Fullscreen button</li>
                <li>• Pull up for contacts</li>
                <li>• Tool stack repositioned</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Touch-First Design</h4>
              <ul className="space-y-1 text-slate-300">
                <li>• 56px primary controls</li>
                <li>• 48px secondary controls</li>
                <li>• Safe area handling</li>
                <li>• No overlap with drawer/panic</li>
                <li>• Works in both orientations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
