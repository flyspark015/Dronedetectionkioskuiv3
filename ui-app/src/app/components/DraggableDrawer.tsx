import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type SnapPoint = 'collapsed' | 'mid' | 'expanded';

interface DraggableDrawerProps {
  children: React.ReactNode;
  contactCount: number;
  defaultSnap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
  currentSnap?: SnapPoint;
}

export function DraggableDrawer({ 
  children, 
  contactCount, 
  defaultSnap = 'mid',
  onSnapChange,
  currentSnap: externalSnap
}: DraggableDrawerProps) {
  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(defaultSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Sync with external snap if provided
  useEffect(() => {
    if (externalSnap && externalSnap !== currentSnap) {
      setCurrentSnap(externalSnap);
    }
  }, [externalSnap]);

  // Snap point heights (percentage of viewport)
  const snapHeights = {
    collapsed: 15, // Just peek at top contacts
    mid: 45,       // Default - balanced view
    expanded: 75   // Focus on contacts
  };

  const getSnapHeight = (snap: SnapPoint) => {
    return `${snapHeights[snap]}vh`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    if (drawerRef.current) {
      setDragStartHeight(drawerRef.current.getBoundingClientRect().height);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    if (drawerRef.current) {
      setDragStartHeight(drawerRef.current.getBoundingClientRect().height);
    }
  };

  const handleMove = (clientY: number) => {
    if (!isDragging || !drawerRef.current) return;

    const deltaY = dragStartY - clientY;
    const newHeight = dragStartHeight + deltaY;
    const viewportHeight = window.innerHeight;
    const percentage = (newHeight / viewportHeight) * 100;

    // Determine closest snap point
    let closestSnap: SnapPoint = 'mid';
    let minDiff = Infinity;

    (Object.keys(snapHeights) as SnapPoint[]).forEach(snap => {
      const diff = Math.abs(snapHeights[snap] - percentage);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnap = snap;
      }
    });

    // Update if significantly different
    if (Math.abs(snapHeights[closestSnap] - percentage) < 10) {
      if (closestSnap !== currentSnap) {
        setCurrentSnap(closestSnap);
        onSnapChange?.(closestSnap);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientY);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
      };
    }
  }, [isDragging]);

  const toggleSnap = () => {
    const nextSnap: SnapPoint = 
      currentSnap === 'collapsed' ? 'mid' :
      currentSnap === 'mid' ? 'expanded' :
      'mid';
    
    setCurrentSnap(nextSnap);
    onSnapChange?.(nextSnap);
  };

  return (
    <div
      ref={drawerRef}
      className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-700 flex flex-col transition-all duration-300 ease-out"
      style={{ height: getSnapHeight(currentSnap) }}
    >
      {/* Grab Handle */}
      <div
        className="flex-shrink-0 px-4 py-3 cursor-grab active:cursor-grabbing touch-none bg-slate-900"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Visual grab indicator */}
        <div className="flex items-center justify-center mb-2">
          <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-slate-100">
              Contacts ({contactCount})
            </h2>
            {currentSnap === 'collapsed' && (
              <span className="text-[12px] text-slate-400">• Pull up for contacts</span>
            )}
          </div>
          <button
            onClick={toggleSnap}
            className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            {currentSnap === 'expanded' ? (
              <ChevronDown size={20} className="text-slate-300" />
            ) : (
              <ChevronUp size={20} className="text-slate-300" />
            )}
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}