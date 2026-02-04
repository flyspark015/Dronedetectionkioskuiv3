import { ReactNode, useEffect, useRef, useState, TouchEvent } from 'react';

/**
 * Android-Native Bottom Sheet
 * 
 * Features:
 * - Large drag handle (48px wide, 4px thick)
 * - Three snap points: collapsed (20vh), half (50vh), full (90vh)
 * - Swipe-to-dismiss gesture
 * - Backdrop click to close
 * - Smooth spring animations
 * - Never blocks bottom navigation
 * 
 * Touch Behavior:
 * - Swipe up → Expand to next snap point
 * - Swipe down → Collapse to previous snap point or dismiss
 * - Tap backdrop → Dismiss
 * - Drag anywhere on header → Resize
 */

export interface TouchBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  initialSnap?: 'collapsed' | 'half' | 'full';
}

export function TouchBottomSheet({
  isOpen,
  onClose,
  children,
  title,
  initialSnap = 'half',
}: TouchBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [snapPoint, setSnapPoint] = useState<'collapsed' | 'half' | 'full'>(initialSnap);

  // Snap point heights (vh units converted to px)
  const getSnapHeight = (point: 'collapsed' | 'half' | 'full') => {
    const vh = window.innerHeight / 100;
    switch (point) {
      case 'collapsed':
        return 20 * vh; // 20vh
      case 'half':
        return 50 * vh; // 50vh
      case 'full':
        return 90 * vh; // 90vh
    }
  };

  // Set initial height when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentHeight(getSnapHeight(initialSnap));
      setSnapPoint(initialSnap);
    }
  }, [isOpen, initialSnap]);

  // Touch start
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
  };

  // Touch move
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = dragStartY - currentY; // Positive = swipe up, Negative = swipe down
    const newHeight = currentHeight + deltaY;

    // Constrain height
    const minHeight = getSnapHeight('collapsed');
    const maxHeight = getSnapHeight('full');
    const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    setCurrentHeight(constrainedHeight);
  };

  // Touch end - snap to nearest point
  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const collapsedHeight = getSnapHeight('collapsed');
    const halfHeight = getSnapHeight('half');
    const fullHeight = getSnapHeight('full');

    // Find nearest snap point
    const distances = [
      { point: 'collapsed' as const, distance: Math.abs(currentHeight - collapsedHeight) },
      { point: 'half' as const, distance: Math.abs(currentHeight - halfHeight) },
      { point: 'full' as const, distance: Math.abs(currentHeight - fullHeight) },
    ];

    const nearest = distances.reduce((prev, curr) =>
      curr.distance < prev.distance ? curr : prev
    );

    // If swiped down below collapsed threshold, dismiss
    if (currentHeight < collapsedHeight * 0.5) {
      onClose();
      return;
    }

    // Snap to nearest point
    setSnapPoint(nearest.point);
    setCurrentHeight(getSnapHeight(nearest.point));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-slate-900 
          rounded-t-[24px]
          shadow-xl
          flex flex-col
          transition-all duration-300 ease-out
          ${isDragging ? '' : 'transition-all'}
        `}
        style={{
          height: `${currentHeight}px`,
          touchAction: 'none',
        }}
      >
        {/* Drag Handle Area - Large touch target */}
        <div
          className="flex-shrink-0 w-full pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag Handle */}
          <div className="drag-handle" />

          {/* Title (optional) */}
          {title && (
            <h2 className="text-lg font-semibold text-slate-100 text-center mt-2 px-4">
              {title}
            </h2>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * Simpler Bottom Sheet without snap points
 * Just open/closed states with swipe-to-dismiss
 */

export interface SimpleBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxHeight?: string; // e.g., "80vh", "600px"
}

export function SimpleBottomSheet({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '80vh',
}: SimpleBottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setTranslateY(0);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY;

    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If dragged down more than 100px, dismiss
    if (translateY > 100) {
      onClose();
    }

    // Reset translation
    setTranslateY(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-slate-900 
          rounded-t-[24px]
          shadow-xl
          flex flex-col
          ${isDragging ? '' : 'transition-transform duration-300 ease-out'}
        `}
        style={{
          maxHeight,
          transform: `translateY(${translateY}px)`,
          touchAction: 'none',
        }}
      >
        {/* Drag Handle Area */}
        <div
          className="flex-shrink-0 w-full pt-3 pb-2 cursor-grab active:cursor-grabbing touch-target"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag Handle */}
          <div className="drag-handle" />

          {/* Title (optional) */}
          {title && (
            <h2 className="text-lg font-semibold text-slate-100 text-center mt-2 px-4">
              {title}
            </h2>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 scroll-panel">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * Bottom Sheet with Tabs
 * For contact details with multiple views
 */

export interface TabConfig {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabbedBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: TabConfig[];
  title?: string;
}

export function TabbedBottomSheet({
  isOpen,
  onClose,
  tabs,
  title,
}: TabbedBottomSheetProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  useEffect(() => {
    if (isOpen && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [isOpen, tabs]);

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <SimpleBottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeight="85vh">
      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 h-[48px] px-4
              text-sm font-medium
              rounded-t-lg
              transition-all duration-100
              touch-target press-feedback
              ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-slate-100 border-b-2 border-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pb-4">{activeContent}</div>
    </SimpleBottomSheet>
  );
}
