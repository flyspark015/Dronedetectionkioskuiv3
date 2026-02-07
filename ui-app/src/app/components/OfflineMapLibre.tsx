import { useEffect, useRef, useState } from 'react';

type Coord = { lat: number; lon: number };

type Props = {
  center: { lat: number; lng: number };
  zoom: number;
  minZoom: number;
  maxZoom: number;
  tileUrl: string;
  onMapClick?: (coord: Coord) => void;
};

export function OfflineMapLibre({ center, zoom, minZoom, maxZoom, tileUrl, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any | null = null;

    const init = async () => {
      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !containerRef.current) return;

        map = new maplibre.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              offline: {
                type: 'raster',
                tiles: [tileUrl],
                tileSize: 256,
                minzoom: minZoom,
                maxzoom: maxZoom,
              },
            },
            layers: [{ id: 'offline', type: 'raster', source: 'offline' }],
          },
          center: [center.lng, center.lat],
          zoom,
          minZoom,
          maxZoom,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });

        mapRef.current = map;

        map.on('click', (evt: any) => {
          if (!evt?.lngLat || !onMapClick) return;
          onMapClick({ lat: evt.lngLat.lat, lon: evt.lngLat.lng });
        });

        map.on('zoomend', () => {
          if (!mapRef.current) return;
          const current = mapRef.current.getZoom();
          if (Number.isFinite(maxZoom) && current > maxZoom) {
            mapRef.current.setZoom(maxZoom);
          }
          if (Number.isFinite(minZoom) && current < minZoom) {
            mapRef.current.setZoom(minZoom);
          }
        });
      } catch (err) {
        if (!cancelled) setInitError('offline_map_init_failed');
      }
    };

    init();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
      mapRef.current = null;
    };
  }, [tileUrl, minZoom, maxZoom, onMapClick, center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter([center.lng, center.lat]);
    if (Number.isFinite(zoom)) map.setZoom(zoom);
    if (Number.isFinite(minZoom)) map.setMinZoom(minZoom);
    if (Number.isFinite(maxZoom)) map.setMaxZoom(maxZoom);
  }, [center.lat, center.lng, zoom, minZoom, maxZoom]);

  if (initError) {
    return (
      <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-300 text-sm">
        Offline map failed to initialize
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}

export default OfflineMapLibre;
