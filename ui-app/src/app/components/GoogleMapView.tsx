import { Component, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import type { Contact } from '@/app/types/contacts';
import { isRemoteIdContact } from '@/app/types/contacts';
import { getMapPackStatus } from '@/app/services/settings';
import { OfflineMapLibre } from '@/app/components/OfflineMapLibre';
import { CoordinateBar } from '@/app/components/CoordinateBar';
import droneSvg from '@/app/assets/remoteid/drone.svg?raw';
import pilotSvg from '@/app/assets/remoteid/pilot.svg?raw';
import homeSvg from '@/app/assets/remoteid/home.svg?raw';

const GM_LIBRARIES = ['marker'] as const;
const containerStyle: CSSProperties = { width: '100%', height: '100%' };

type Coord = { lat: number; lon: number };

type MarkerPayload = {
  id: string;
  drone?: Coord;
  pilot?: Coord;
  home?: Coord;
  pilotOffset?: { x: number; y: number };
  homeOffset?: { x: number; y: number };
};

type MarkerEntry = {
  drone?: any;
  pilot?: any;
  home?: any;
};

type OfflinePack = {
  id: string;
  name?: string;
  bbox?: { north: number; south: number; east: number; west: number };
  zmin?: number;
  zmax?: number;
  status?: string;
};

const toGooglePos = (pos: Coord) => ({ lat: pos.lat, lng: pos.lon });

const isValidCoord = (pos?: Coord | null) => {
  if (!pos) return false;
  return Number.isFinite(Number(pos.lat)) && Number.isFinite(Number(pos.lon));
};

const coordsClose = (a?: Coord | null, b?: Coord | null, eps = 1e-6) => {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) <= eps && Math.abs(a.lon - b.lon) <= eps;
};

const iconSvg = {
  drone: droneSvg,
  pilot: pilotSvg,
  home: homeSvg,
};

const getBboxCenter = (bbox?: { north: number; south: number; east: number; west: number }) => {
  if (!bbox) return null;
  const lat = (Number(bbox.north) + Number(bbox.south)) / 2;
  const lon = (Number(bbox.east) + Number(bbox.west)) / 2;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lng: lon };
};

const buildTileTemplate = (packId: string) => `/tiles/${packId}/{z}/{x}/{y}.png`;

const createMarkerElement = (type: 'drone' | 'pilot' | 'home', offset?: { x: number; y: number }) => {
  const wrapper = document.createElement('div');
  wrapper.style.width = '34px';
  wrapper.style.height = '34px';
  wrapper.style.fontSize = '34px';
  const baseTransform = 'translate(-50%, -100%)';
  const dx = offset?.x ?? 0;
  const dy = offset?.y ?? 0;
  wrapper.style.transform = dx || dy ? `${baseTransform} translate(${dx}px, ${dy}px)` : baseTransform;
  wrapper.style.willChange = 'transform';
  wrapper.style.pointerEvents = 'auto';
  wrapper.innerHTML = iconSvg[type];
  const svg = wrapper.querySelector('svg');
  if (svg) {
    svg.setAttribute('width', '34');
    svg.setAttribute('height', '34');
  }
  wrapper.setAttribute('aria-label', type);
  wrapper.setAttribute('title', type === 'drone' ? 'Drone' : type === 'pilot' ? 'Pilot' : 'Home');
  return wrapper;
};

type Props = {
  contacts: Contact[];
  gpsFixQuality?: number | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  focusContact?: Contact | null;
  mapMode?: 'online' | 'offline' | 'auto';
  offlinePackId?: string | null;
  onLoadError?: (reason: 'missing_key' | 'load_error') => void;
};

class MapErrorBoundary extends Component<
  { onError?: (error: Error) => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  componentDidCatch(error: Error) {
    this.setState({ hasError: true });
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function GoogleMapView({
  contacts,
  gpsFixQuality,
  gpsLatitude,
  gpsLongitude,
  focusContact,
  mapMode = 'online',
  offlinePackId = null,
  onLoadError,
}: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries: GM_LIBRARIES,
  });

  const [renderError, setRenderError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiKey) {
      onLoadError?.('missing_key');
    }
  }, [apiKey, onLoadError]);

  useEffect(() => {
    if (loadError) {
      onLoadError?.('load_error');
    }
  }, [loadError, onLoadError]);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (typeof event?.message === 'string' && event.message.includes('gn is not defined')) {
        const err = new Error(event.message);
        setRenderError(err);
        onLoadError?.('load_error');
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
      }
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, [onLoadError]);

  useEffect(() => {
    if (!isLoaded) return;
    const hasGoogle = typeof window !== 'undefined' && (window as any).google?.maps;
    if (!hasGoogle) {
      const err = new Error('google_maps_missing');
      setRenderError(err);
      onLoadError?.('load_error');
    }
  }, [isLoaded, onLoadError]);

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [offlinePack, setOfflinePack] = useState<OfflinePack | null>(null);
  const [offlinePackError, setOfflinePackError] = useState<string | null>(null);
  const [clickedCoord, setClickedCoord] = useState<Coord | null>(null);
  const buildTagLabel = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.has('build_tag') ? 'offline-hard-20260207' : null;
  }, []);

  const mapRef = useRef<google.maps.Map | null>(null);
  const myMarkerRef = useRef<any>(null);
  const contactMarkersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const markerCacheRef = useRef<Map<string, MarkerPayload>>(new Map());
  const pendingMarkersRef = useRef<MarkerPayload[]>([]);
  const updateTimerRef = useRef<number | null>(null);
  const lastFocusRef = useRef<{ id: string; lat: number; lon: number } | null>(null);
  const autoCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);
  const onlineMapTypeRef = useRef<google.maps.MapTypeId>('satellite');
  const mapTypeListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!offlinePackId) {
      setOfflinePack(null);
      setOfflinePackError(null);
      return undefined;
    }
    // Clear stale pack while loading the next selection.
    setOfflinePack(null);
    setOfflinePackError(null);
    getMapPackStatus(offlinePackId).then((res) => {
      if (!active) return;
      if (res.ok && res.data?.pack) {
        setOfflinePack(res.data.pack as OfflinePack);
        setOfflinePackError(null);
      } else {
        setOfflinePack(null);
        setOfflinePackError(res.error || 'pack_unavailable');
      }
    });
    return () => {
      active = false;
    };
  }, [offlinePackId]);

  const gpsLat = gpsLatitude != null ? Number(gpsLatitude) : NaN;
  const gpsLon = gpsLongitude != null ? Number(gpsLongitude) : NaN;
  const hasFix = gpsFixQuality == null ? true : (gpsFixQuality ?? 0) >= 2;
  const hasValidGPS = hasFix && Number.isFinite(gpsLat) && Number.isFinite(gpsLon);
  const myPos = hasValidGPS ? { lat: gpsLat, lon: gpsLon } : null;

  const offlineCenter = useMemo(() => getBboxCenter(offlinePack?.bbox), [offlinePack]);
  const offlineZoom = useMemo(() => {
    if (!offlinePack) return 16;
    const zmin = Number(offlinePack.zmin ?? 12);
    const zmax = Number(offlinePack.zmax ?? zmin);
    if (!Number.isFinite(zmin) || !Number.isFinite(zmax)) return 16;
    return Math.min(Math.max(zmax, zmin), 20);
  }, [offlinePack]);

  const offlineSelected = mapMode === 'offline';
  const offlineAuto = mapMode === 'auto' && !isOnline;
  const offlineMode = offlineSelected || offlineAuto;
  const scriptUnavailable = !apiKey || Boolean(loadError);

  const offlinePackSelected = Boolean(offlinePackId && offlinePackId.trim());
  const offlinePackMatches = Boolean(offlinePack && offlinePack.id === offlinePackId);
  const offlineStatusRaw = String(offlinePack?.status ?? '').toLowerCase();
  const offlineStatusOk = offlineStatusRaw === 'ready' || offlineStatusRaw === 'done';
  const offlineBboxOk = Boolean(offlinePack?.bbox) && Boolean(offlineCenter);
  const offlinePackOk = offlinePackSelected && offlinePackMatches && offlineStatusOk && offlineBboxOk;

  const useOfflineFallback = !offlineMode && scriptUnavailable && offlinePackOk;
  const useOfflineTiles = (offlineMode && offlinePackOk) || useOfflineFallback;

  const handleBoundaryError = (err: Error) => {
    setRenderError(err);
    onLoadError?.('load_error');
  };

  const initialCenter = useMemo(() => {
    if (myPos) return toGooglePos(myPos);
    for (const c of contacts) {
      if (!isRemoteIdContact(c)) continue;
      const dc = c.remote_id?.drone_coords;
      if (dc && isValidCoord(dc)) return toGooglePos({ lat: dc.lat, lon: dc.lon });
    }
    if (offlineCenter) return offlineCenter;
    return { lat: 20.5937, lng: 78.9629 };
  }, [contacts, myPos, offlineCenter]);

  const applyMarkerUpdates = (payloads: MarkerPayload[]) => {
    const map = mapRef.current;
    if (!map) return;
    const Adv = (google.maps as any)?.marker?.AdvancedMarkerElement;
    if (!Adv) return;

    const applyOffset = (marker: any, offset?: { x: number; y: number }) => {
      if (!marker?.content) return;
      const baseTransform = 'translate(-50%, -100%)';
      const dx = offset?.x ?? 0;
      const dy = offset?.y ?? 0;
      marker.content.style.transform = dx || dy ? `${baseTransform} translate(${dx}px, ${dy}px)` : baseTransform;
    };

    for (const payload of payloads) {
      const entry = contactMarkersRef.current.get(payload.id) || {};

      const setMarker = (
        role: 'drone' | 'pilot' | 'home',
        coords?: Coord,
        offset?: { x: number; y: number },
      ) => {
        if (coords && isValidCoord(coords)) {
          if (!entry[role]) {
            entry[role] = new Adv({
              map,
              position: toGooglePos(coords),
              content: createMarkerElement(role, offset),
            });
          } else {
            entry[role].position = toGooglePos(coords);
            entry[role].map = map;
          }
          applyOffset(entry[role], offset);
        } else if (entry[role]) {
          entry[role].map = null;
          delete entry[role];
        }
      };

      setMarker('drone', payload.drone);
      setMarker('pilot', payload.pilot, payload.pilotOffset);
      setMarker('home', payload.home, payload.homeOffset);

      contactMarkersRef.current.set(payload.id, entry);
    }
  };

  const scheduleMarkerUpdate = (payloads: MarkerPayload[]) => {
    pendingMarkersRef.current = payloads;
    if (updateTimerRef.current != null) return;
    updateTimerRef.current = window.setTimeout(() => {
      updateTimerRef.current = null;
      applyMarkerUpdates(pendingMarkersRef.current);
    }, 250);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const Adv = (google.maps as any)?.marker?.AdvancedMarkerElement;
    const Pin = (google.maps as any)?.marker?.PinElement;
    if (!Adv || !Pin) return;

    if (myPos) {
      if (!myMarkerRef.current) {
        const myPin = new Pin({
          background: '#1a73e8',
          borderColor: '#1a73e8',
          glyphColor: '#ffffff',
          scale: 1.1,
        });
        myMarkerRef.current = new Adv({
          map,
          position: toGooglePos(myPos),
          title: 'My Location',
          content: myPin.element,
        });
      } else {
        myMarkerRef.current.position = toGooglePos(myPos);
        myMarkerRef.current.map = map;
      }
    } else if (myMarkerRef.current) {
      myMarkerRef.current.map = null;
      myMarkerRef.current = null;
    }

    const nextIds = new Set<string>();
    const payloads: MarkerPayload[] = [];

    for (const c of contacts) {
      if (!isRemoteIdContact(c)) continue;
      nextIds.add(c.id);

      const cache = markerCacheRef.current.get(c.id) || { id: c.id };

      const drone = c.remote_id?.drone_coords;
      const pilot = c.remote_id?.pilot_coords;
      const home = c.remote_id?.home_coords;

      if (isValidCoord(drone)) cache.drone = { lat: drone.lat, lon: drone.lon };
      if (isValidCoord(pilot)) cache.pilot = { lat: pilot.lat, lon: pilot.lon };
      if (isValidCoord(home)) cache.home = { lat: home.lat, lon: home.lon };

      markerCacheRef.current.set(c.id, cache);

      const droneCoord = cache.drone;
      const pilotCoord = cache.pilot;
      const homeCoord = cache.home;

      let pilotOffset = { x: 0, y: 0 };
      let homeOffset = { x: 0, y: 0 };

      const pilotOnDrone = coordsClose(pilotCoord, droneCoord);
      const homeOnDrone = coordsClose(homeCoord, droneCoord);
      const pilotOnHome = coordsClose(pilotCoord, homeCoord);

      if (pilotOnDrone) pilotOffset = { x: 18, y: 0 };
      if (homeOnDrone) homeOffset = { x: -18, y: 0 };
      if (pilotOnHome && !pilotOnDrone && !homeOnDrone) {
        pilotOffset = { x: 16, y: 0 };
        homeOffset = { x: -16, y: 0 };
      }

      payloads.push({
        id: c.id,
        drone: droneCoord,
        pilot: pilotCoord,
        home: homeCoord,
        pilotOffset,
        homeOffset,
      });
    }

    for (const [id, entry] of contactMarkersRef.current.entries()) {
      if (!nextIds.has(id)) {
        if (entry.drone) entry.drone.map = null;
        if (entry.pilot) entry.pilot.map = null;
        if (entry.home) entry.home.map = null;
        contactMarkersRef.current.delete(id);
      }
    }

    for (const id of markerCacheRef.current.keys()) {
      if (!nextIds.has(id)) markerCacheRef.current.delete(id);
    }

    scheduleMarkerUpdate(payloads);
  }, [contacts, myPos, isLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    if (autoCenteredRef.current || userInteractedRef.current) return;
    if (initialCenter) {
      map.setCenter(initialCenter);
      map.setZoom(useOfflineTiles ? offlineZoom : 16);
      autoCenteredRef.current = true;
    }
  }, [initialCenter, isLoaded, offlineZoom, useOfflineTiles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !focusContact || !isRemoteIdContact(focusContact)) return;

    const cached = markerCacheRef.current.get(focusContact.id);
    const dc = isValidCoord(focusContact.remote_id?.drone_coords)
      ? focusContact.remote_id?.drone_coords
      : cached?.drone;

    if (!dc || !isValidCoord(dc)) return;

    const last = lastFocusRef.current;
    if (last && last.id === focusContact.id && last.lat === dc.lat && last.lon === dc.lon) return;
    lastFocusRef.current = { id: focusContact.id, lat: dc.lat, lon: dc.lon };

    map.panTo(toGooglePos({ lat: dc.lat, lon: dc.lon }));
    const currentZoom = map.getZoom();
    if (currentZoom != null) {
      const nextZoom = Math.min(Math.max(currentZoom, 13), 18);
      if (nextZoom !== currentZoom) map.setZoom(nextZoom);
    }
  }, [focusContact, isLoaded, contacts]);

  useEffect(() => {
    return () => {
      if (myMarkerRef.current) {
        myMarkerRef.current.map = null;
        myMarkerRef.current = null;
      }
      for (const [, mk] of contactMarkersRef.current.entries()) {
        if (mk.drone) mk.drone.map = null;
        if (mk.pilot) mk.pilot.map = null;
        if (mk.home) mk.home.map = null;
      }
      contactMarkersRef.current.clear();
      markerCacheRef.current.clear();
      if (updateTimerRef.current != null) {
        window.clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      if (mapTypeListenerRef.current) {
        mapTypeListenerRef.current.remove();
        mapTypeListenerRef.current = null;
      }
    };
  }, []);

  if (offlineSelected && !offlinePackOk) {
    const reasons: string[] = [];
    if (!offlinePackSelected) {
      reasons.push('No offline pack selected');
    } else {
      if (!offlinePack) reasons.push('Offline pack not found');
      if (offlinePack && offlinePack.id !== offlinePackId) {
        reasons.push(`Loaded pack: ${offlinePack.id}`);
      }
      if (offlinePack && !offlineStatusOk) reasons.push(`Pack status: ${offlinePack?.status ?? 'unknown'}`);
      if (offlinePack && !offlineBboxOk) reasons.push('Pack bbox missing');
      if (offlinePackError) reasons.push(`Pack error: ${offlinePackError}`);
    }

    return (
      <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-slate-300 text-sm gap-2 px-4 text-center">
        <div className="text-slate-100 font-medium">Offline pack not ready</div>
        {reasons.length > 0 && (
          <div className="text-xs text-slate-500">{reasons.join(' • ')}</div>
        )}
        {buildTagLabel && (
          <div className="text-[10px] text-slate-600">build: {buildTagLabel}</div>
        )}
      </div>
    );
  }

  const defaultZoom = useOfflineTiles ? offlineZoom : 16;
  const offlineMinZoom = Number.isFinite(Number(offlinePack?.zmin)) ? Number(offlinePack?.zmin) : 0;
  const offlineMaxZoom = Number.isFinite(Number(offlinePack?.zmax)) ? Number(offlinePack?.zmax) : 22;
  const offlineInitialZoom = Math.min(defaultZoom, offlineMaxZoom);

  if (useOfflineTiles && offlineCenter) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800">
        <div className="absolute top-2 left-2 z-10 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-100">
          Offline map (cached tiles)
        </div>
        {buildTagLabel && (
          <div className="absolute top-2 right-2 z-10 rounded-full bg-slate-900/90 px-2 py-1 text-[10px] text-slate-300">
            build: {buildTagLabel}
          </div>
        )}
        <OfflineMapLibre
          key={`offline-${offlinePackId}-${offlineMinZoom}-${offlineMaxZoom}`}
          center={{ lat: offlineCenter.lat, lng: offlineCenter.lng }}
          zoom={offlineInitialZoom}
          minZoom={offlineMinZoom}
          maxZoom={offlineMaxZoom}
          tileUrl={buildTileTemplate(offlinePackId as string)}
          onMapClick={(coord) => setClickedCoord(coord)}
        />
        <CoordinateBar
          lat={clickedCoord?.lat ?? null}
          lon={clickedCoord?.lon ?? null}
          onClear={() => setClickedCoord(null)}
        />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-300 text-sm">
        Google Maps API key missing (set VITE_GOOGLE_MAPS_API_KEY)
      </div>
    );
  }

  if (loadError || renderError) {
    return (
      <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-red-300 text-sm">
        Google Maps failed to load
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-300 text-sm">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800">
      {offlineMode && !offlinePackId && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-100">
          No offline pack selected
        </div>
      )}
      {buildTagLabel && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-slate-900/90 px-2 py-1 text-[10px] text-slate-300">
          build: {buildTagLabel}
        </div>
      )}
      <MapErrorBoundary onError={handleBoundaryError}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          onLoad={(m) => {
            mapRef.current = m;
            try {
              m.setMapTypeId(onlineMapTypeRef.current);
            } catch {}
            if (mapTypeListenerRef.current) {
              mapTypeListenerRef.current.remove();
            }
            mapTypeListenerRef.current = m.addListener('maptypeid_changed', () => {
              const next = m.getMapTypeId();
              if (next) onlineMapTypeRef.current = next;
            });
          }}
          onClick={(evt) => {
            const ll = evt?.latLng;
            if (!ll) return;
            setClickedCoord({ lat: ll.lat(), lon: ll.lng() });
          }}
          onDragStart={() => {
            userInteractedRef.current = true;
          }}
          onZoomChanged={() => {
            userInteractedRef.current = true;
          }}
          defaultCenter={initialCenter}
          defaultZoom={defaultZoom}
          options={{
            mapTypeId: onlineMapTypeRef.current,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: true,
            gestureHandling: 'greedy',
          }}
        />
      </MapErrorBoundary>
      <CoordinateBar
        lat={clickedCoord?.lat ?? null}
        lon={clickedCoord?.lon ?? null}
        onClear={() => setClickedCoord(null)}
      />
    </div>
  );
}
