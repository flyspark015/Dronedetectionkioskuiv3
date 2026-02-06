import { Component, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import type { Contact } from '@/app/types/contacts';
import { isRemoteIdContact } from '@/app/types/contacts';
import { getMapPackStatus } from '@/app/services/settings';
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

const TILE_SIZE = 256;

const clampLat = (lat: number) => Math.max(-85.05112878, Math.min(85.05112878, lat));

const lonLatToTile = (lon: number, lat: number, zoom: number) => {
  const clampedLat = clampLat(lat);
  const n = 2 ** zoom;
  const xtile = Math.floor(((lon + 180) / 360) * n);
  const latRad = (clampedLat * Math.PI) / 180;
  const ytile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, xtile)), y: Math.max(0, Math.min(n - 1, ytile)) };
};

const getBboxCenter = (bbox?: { north: number; south: number; east: number; west: number }) => {
  if (!bbox) return null;
  const lat = (Number(bbox.north) + Number(bbox.south)) / 2;
  const lon = (Number(bbox.east) + Number(bbox.west)) / 2;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lng: lon };
};

const buildTileUrl = (packId: string, z: number, x: number, y: number) =>
  `/tiles/${packId}/${z}/${x}/${y}.png`;

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
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

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

  const mapRef = useRef<google.maps.Map | null>(null);
  const myMarkerRef = useRef<any>(null);
  const contactMarkersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const markerCacheRef = useRef<Map<string, MarkerPayload>>(new Map());
  const pendingMarkersRef = useRef<MarkerPayload[]>([]);
  const updateTimerRef = useRef<number | null>(null);
  const lastFocusRef = useRef<{ id: string; lat: number; lon: number } | null>(null);
  const autoCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);

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

  const offlineMode = mapMode === 'offline' || !isOnline;
  const scriptUnavailable = !apiKey || Boolean(loadError);
  const useOfflineTiles = (offlineMode || scriptUnavailable) && Boolean(offlinePackId);

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
    if (!map || !isLoaded) return;

    const offlineTypeId = 'offline-pack';
    if (!useOfflineTiles || !offlinePackId) {
      if (map.getMapTypeId() === offlineTypeId) {
        map.setMapTypeId('hybrid');
      }
      return;
    }

    const minZoom = Number(offlinePack?.zmin ?? 0);
    const maxZoom = Number(offlinePack?.zmax ?? 22);

    if (!map.mapTypes.get(offlineTypeId)) {
      const offlineType = new google.maps.ImageMapType({
        name: 'Offline',
        tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
        minZoom: Number.isFinite(minZoom) ? minZoom : 0,
        maxZoom: Number.isFinite(maxZoom) ? maxZoom : 22,
        getTileUrl: (coord, zoom) => buildTileUrl(offlinePackId, zoom, coord.x, coord.y),
      });
      map.mapTypes.set(offlineTypeId, offlineType);
    }

    if (Number.isFinite(minZoom) && Number.isFinite(maxZoom)) {
      map.setOptions({ minZoom, maxZoom });
    }
    map.setMapTypeId(offlineTypeId);
  }, [useOfflineTiles, offlinePackId, offlinePack?.zmin, offlinePack?.zmax, isLoaded]);

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
    };
  }, []);

  const showOfflineFallback = (offlineMode || scriptUnavailable) && (!isLoaded || loadError || !apiKey || renderError);

  if (showOfflineFallback) {
    if (!offlineMode && !offlinePackId && !apiKey) {
      return (
        <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-300 text-sm">
          Google Maps API key missing (set VITE_GOOGLE_MAPS_API_KEY)
        </div>
      );
    }
    if (!offlinePackId) {
      return (
        <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-300 text-sm">
          Offline map pack not selected
        </div>
      );
    }

    if (!offlinePack || !offlineCenter) {
      return (
        <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-slate-300 text-sm gap-2">
          <div>Offline pack unavailable</div>
          {offlinePackError && (
            <div className="text-xs text-slate-500">{offlinePackError}</div>
          )}
        </div>
      );
    }

    const zoom = offlineZoom;
    const centerTile = lonLatToTile(offlineCenter.lng, offlineCenter.lat, zoom);
    const tiles: Array<{ key: string; x: number; y: number }> = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = centerTile.x + dx;
        const y = centerTile.y + dy;
        tiles.push({ key: `${zoom}/${x}/${y}`, x, y });
      }
    }

    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div className="absolute top-2 left-2 z-10 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-100">
          Offline map (cached tiles)
        </div>
        <div className="grid h-full w-full grid-cols-3 grid-rows-3">
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={buildTileUrl(offlinePackId, zoom, tile.x, tile.y)}
              alt="offline tile"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ))}
        </div>
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
      {useOfflineTiles && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-100">
          Offline map (cached tiles)
        </div>
      )}
      {offlineMode && !offlinePackId && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-100">
          No offline pack selected
        </div>
      )}
      <MapErrorBoundary onError={handleBoundaryError}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          onLoad={(m) => {
            mapRef.current = m;
          }}
          onDragStart={() => {
            userInteractedRef.current = true;
          }}
          onZoomChanged={() => {
            userInteractedRef.current = true;
          }}
          defaultCenter={initialCenter}
          defaultZoom={16}
          options={{
            mapTypeId: 'roadmap',
            ...(mapId ? { mapId } : {}),
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: true,
            gestureHandling: 'greedy',
          }}
        />
      </MapErrorBoundary>
    </div>
  );
}
