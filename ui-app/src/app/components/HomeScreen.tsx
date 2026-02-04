import { useState, useEffect } from 'react';
import { DraggableDrawer } from './DraggableDrawer';
import { ContactsDrawerContent } from './ContactsDrawerContent';
import { MapHUD } from './MapHUD';
import { MapLibreView } from './MapLibreView';
import { SelectedContactOverlay } from './SelectedContactOverlay';
import { MapToolStack } from './MapToolStack';
import { CompassControl } from './CompassControl';
import { FullscreenMapBar } from './FullscreenMapBar';
import type { Contact } from '@/app/types/contacts';
import { getPmtilesPacks } from '@/app/services/settings';

interface HomeScreenProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  scanState: 'scanning' | 'locked' | 'hold' | 'stopped';
  onPanicCollapse: (collapsed: boolean) => void;
  hasCriticalAlert?: boolean;
  gpsFixQuality?: number;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
}

export function HomeScreen({
  contacts,
  onContactClick,
  scanState,
  onPanicCollapse,
  hasCriticalAlert = false,
  gpsFixQuality = 2,
  gpsLatitude,
  gpsLongitude,
}: HomeScreenProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [drawerSnap, setDrawerSnap] = useState<'collapsed' | 'mid' | 'expanded'>('mid');
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [mapHeading, setMapHeading] = useState(0);
  const [zoom, setZoom] = useState(14);
  const [pmtilesReady, setPmtilesReady] = useState(false);

  // Count Remote ID contacts for map markers
  const remoteIdCount = contacts.filter(c => c.type === 'REMOTE_ID').length;
  const mapReady = pmtilesReady;
  const activePackId = mapReady ? 'india' : null;
  const overlayLabel = 'Offline map not available';

  // Mock telemetry and GPS data
  const telemetryAge = 2;
  const gpsAccuracy = 1.2;

  // When entering fullscreen, collapse drawer
  useEffect(() => {
    if (isFullscreenMap && drawerSnap !== 'collapsed') {
      setDrawerSnap('collapsed');
    }
  }, [isFullscreenMap]);

  useEffect(() => {
    let cancelled = false;
    const loadPmtilesStatus = async () => {
      const res = await getPmtilesPacks();
      if (cancelled) return;
      if (res.ok) {
        const pack = Array.isArray(res.data?.packs) ? res.data.packs[0] : null;
        const installed = Boolean(pack?.installed);
        const bytes = Number(pack?.bytes ?? 0);
        setPmtilesReady(installed && bytes > 0);
        return;
      }
      setPmtilesReady(false);
    };
    loadPmtilesStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDrawerSnapChange = (snap: 'collapsed' | 'mid' | 'expanded') => {
    setDrawerSnap(snap);
    // If expanding drawer, exit fullscreen
    if (isFullscreenMap && snap !== 'collapsed') {
      setIsFullscreenMap(false);
    }
  };

  const handleContactClick = (contact: Contact) => {
    // If Remote ID, also select on map
    if (contact.type === 'REMOTE_ID') {
      setSelectedContact(contact);
    }
    onContactClick(contact);
  };

  const handleScrolling = (isScrolling: boolean) => {
    onPanicCollapse(isScrolling);
  };

  const handleFullscreen = () => {
    setIsFullscreenMap(true);
    setDrawerSnap('collapsed');
  };

  const handleExitFullscreen = () => {
    setIsFullscreenMap(false);
    setDrawerSnap('mid');
  };

  const handlePullUpFromFullscreen = () => {
    setIsFullscreenMap(false);
    setDrawerSnap('mid');
  };

  const handleFocusSelected = () => {
    if (selectedContact) {
      console.log('Focus on selected contact:', selectedContact.id);
      // Would zoom to selected marker
    }
  };

  const handleFitMarkers = () => {
    if (remoteIdCount > 0) {
      console.log('Fit to all markers');
      // Would adjust map bounds to show all markers
    }
  };

  const handleCenterMe = () => {
    console.log('Center on GPS location');
    // Would center map on user location
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 1, 20));
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 1, 1));
    console.log('Zoom out');
  };

  const handleResetNorth = () => {
    setMapHeading(0);
    console.log('Reset to North');
  };

  return (
    <div className="relative w-full h-[calc(100vh-160px)] min-h-[260px] flex-1">
      {/* Map Panel - fills entire space */}
      <div className={`absolute inset-0 bg-slate-900 transition-all duration-300 ${
        isFullscreenMap ? 'bg-slate-950' : ''
      }`}>
        <div className="absolute inset-0">
          <MapLibreView
            online={false}
            gpsFixQuality={gpsFixQuality}
            gpsLatitude={gpsLatitude ?? null}
            gpsLongitude={gpsLongitude ?? null}
            activePackId={activePackId}
          />
        </div>

        {!mapReady && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-2 text-[13px] text-slate-100 shadow-lg">
              {overlayLabel}
            </div>
          </div>
        )}

        {/* Map HUD - top-left */}
        <MapHUD
          ridMarkersCount={remoteIdCount}
          telemetryAge={telemetryAge}
          gpsAccuracy={gpsAccuracy}
        />

        {/* Compass Control - top-right */}
        <div className="absolute top-3 right-3 z-10">
          <CompassControl heading={mapHeading} onResetNorth={handleResetNorth} />
        </div>

        {/* Scan State Widget - top-left below HUD */}
        <div className="absolute top-[120px] left-3 bg-slate-900/95 rounded-2xl px-4 py-2 border border-slate-700 shadow-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              scanState === 'scanning' ? 'bg-blue-400 animate-pulse' :
              scanState === 'locked' ? 'bg-amber-400' :
              scanState === 'hold' ? 'bg-green-400' :
              'bg-slate-600'
            }`} />
            <span className="text-[12px] font-semibold text-slate-100">
              {scanState.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Selected Contact Overlay - bottom-left (only when not fullscreen) */}
        {!isFullscreenMap && (
          <SelectedContactOverlay
            contact={selectedContact}
            onClear={() => setSelectedContact(null)}
            gpsFixQuality={gpsFixQuality}
          />
        )}

        {/* Map Tool Stack - right side vertical */}
        <MapToolStack
          onFullscreen={handleFullscreen}
          onFocusSelected={handleFocusSelected}
          onFitMarkers={handleFitMarkers}
          onCenterMe={handleCenterMe}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          hasSelectedContact={selectedContact !== null}
          hasMarkers={remoteIdCount > 0}
          isFullscreen={isFullscreenMap}
        />
      </div>

      {/* Fullscreen Map Bar - replaces drawer when fullscreen */}
      {isFullscreenMap ? (
        <FullscreenMapBar
          contactCount={contacts.length}
          onExit={handleExitFullscreen}
          onPullUp={handlePullUpFromFullscreen}
        />
      ) : (
        /* Draggable Contacts Drawer - normal mode */
        <DraggableDrawer
          contactCount={contacts.length}
          defaultSnap="mid"
          currentSnap={drawerSnap}
          onSnapChange={handleDrawerSnapChange}
        >
          <ContactsDrawerContent
            contacts={contacts}
            onContactClick={handleContactClick}
            snapState={drawerSnap}
            onScrolling={handleScrolling}
            gpsFixQuality={gpsFixQuality}
          />
        </DraggableDrawer>
      )}
    </div>
  );
}
