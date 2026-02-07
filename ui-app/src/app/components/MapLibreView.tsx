import { useEffect, useRef, useState } from 'react';

const PMTILES_BASE_URL = '/pmtiles';
const FIXED_PACK_ID = 'india';
const MBTILES_PACK_ID = 'asia';
const MBTILES_STATUS_URL = '/api/v1/maps/mbtiles/status';
const MBTILES_TILE_URL = `/mbtiles/${MBTILES_PACK_ID}/{z}/{x}/{y}.png`;
const buildHttpUrl = (packId: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${PMTILES_BASE_URL}/${packId}.pmtiles`;
};
const buildPmtilesUrl = (packId: string) => `pmtiles://${buildHttpUrl(packId)}`;

const detectWebglSupport = () => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
};

const extractVectorLayers = (metadata: any): string[] => {
  if (!metadata) return [];
  if (Array.isArray(metadata.vector_layers)) {
    return metadata.vector_layers.map((layer: any) => layer?.id).filter(Boolean);
  }
  if (typeof metadata.json === 'string') {
    try {
      const parsed = JSON.parse(metadata.json);
      if (Array.isArray(parsed?.vector_layers)) {
        return parsed.vector_layers.map((layer: any) => layer?.id).filter(Boolean);
      }
    } catch {}
  }
  return [];
};

const buildVectorLayers = (vectorLayers?: string[] | null) => {
  const layers = Array.isArray(vectorLayers) ? vectorLayers.slice(0, 12) : [];
  return layers.map((layer) => ({
    id: `line-${layer}`,
    type: 'line',
    source: 'pm',
    'source-layer': layer,
    filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
    paint: { 'line-color': '#ffffff', 'line-width': 1 },
  }));
};

const buildRasterLayer = () => ({
  id: 'raster',
  type: 'raster',
  source: 'pm',
});

const buildStyle = (sourceSpec: any, layers: any[]) => ({
  version: 8,
  sources: { pm: sourceSpec },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0f172a' },
    },
    ...layers,
  ],
});

const INITIAL_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0f172a' },
    },
  ],
} as const;

const INITIAL_DEBUG_INFO = {
  initOk: false,
  styleLoaded: false,
  sourceLoaded: false,
  rendered: false,
  canvasW: 0,
  canvasH: 0,
  webgl: false,
  styleSetCount: 0,
  lastError: '',
};

type Props = {
  gpsFixQuality?: number | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  online: boolean;
  activePackId?: string | null;
};

type MaplibreLibs = {
  maplibregl: any;
  Protocol: any;
  PMTiles: any;
  TileType: any;
};

type MapLibreRuntimeState = {
  protocol: any | null;
  protocolOwner: any | null;
  pmtilesRegistry: Map<string, any>;
};

let runtimeState: MapLibreRuntimeState | null = null;

const ensureMapLibreRuntime = (libs: MaplibreLibs | null) => {
  if (!libs) return null;
  if (!runtimeState) {
    runtimeState = { protocol: null, protocolOwner: null, pmtilesRegistry: new Map() };
  }
  if (!runtimeState.protocol || runtimeState.protocolOwner !== libs.maplibregl) {
    runtimeState.protocol = new libs.Protocol();
    libs.maplibregl.addProtocol('pmtiles', runtimeState.protocol.tile);
    runtimeState.protocolOwner = libs.maplibregl;
  }
  return runtimeState;
};

export function MapLibreView({ gpsFixQuality, gpsLatitude, gpsLongitude, online }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const protocolRef = useRef<any | null>(null);
  const libsRef = useRef<MaplibreLibs | null>(null);
  const [libsReady, setLibsReady] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [mapUnsupported, setMapUnsupported] = useState(false);
  const [pmtilesKind, setPmtilesKind] = useState<'vector' | 'raster' | 'mbtiles' | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [packHeader, setPackHeader] = useState<any | null>(null);
  const [packLayers, setPackLayers] = useState<string[] | null>(null);
  const [mbtilesReady, setMbtilesReady] = useState(false);
  const [mbtilesMeta, setMbtilesMeta] = useState<any | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);
  const [initReason, setInitReason] = useState<string | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [renderStalled, setRenderStalled] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const debugEnabled = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debug') === '1';
  const effectivePackId = FIXED_PACK_ID;
  const stableSizeRef = useRef<{ w: number; h: number } | null>(null);
  const stableFramesRef = useRef(0);
  const styleAppliedRef = useRef(false);
  const renderedRef = useRef(false);
  const sawRenderRef = useRef(false);
  const styleLoadedRef = useRef(false);
  const sourceLoadedRef = useRef(false);
  const firstFrameKickRef = useRef(false);
  const recoveryAttemptRef = useRef(0);
  const recoveryTimerRef = useRef<number | null>(null);
  const failureTimerRef = useRef<number | null>(null);
  const loadPollerRef = useRef<number | null>(null);
  const styleSetCountRef = useRef(0);
  const workerReadyRef = useRef(false);
  const workerWarnedRef = useRef(false);
  const markerAddedRef = useRef(false);
  const initialViewRef = useRef<{ center: [number, number]; zoom: number; maxZoom: number } | null>(null);
  const packInitRef = useRef(false);
  const debugInfoRef = useRef({ ...INITIAL_DEBUG_INFO });
  const stateSnapshotRef = useRef({
    pmtilesKind: null as 'vector' | 'raster' | null,
    packError: null as string | null,
    packLayersCount: null as number | null,
    mapUnsupported: false,
    initTimeout: false,
    initReason: null as string | null,
    mapError: null as string | null,
  });
  const [debugInfo, setDebugInfo] = useState(INITIAL_DEBUG_INFO);
  const debugPublishTimer = useRef<number | null>(null);

  const guardLog = (...args: any[]) => {
    console.info('[MapLibre]', ...args);
  };

  const publishDebug = () => {
    const snapshot = stateSnapshotRef.current;
    const payload = {
      ts: Date.now(),
      activePackId: effectivePackId,
      pmtilesKind: snapshot.pmtilesKind,
      packError: snapshot.packError,
      packLayersCount: snapshot.packLayersCount,
      mapUnsupported: snapshot.mapUnsupported,
      initTimeout: snapshot.initTimeout,
      initReason: snapshot.initReason,
      mapError: snapshot.mapError,
      ...debugInfoRef.current,
    };
    try {
      const body = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        const ok = navigator.sendBeacon('/api/v1/ui/debug/maplibre', blob);
        if (ok) return;
      }
      fetch('/api/v1/ui/debug/maplibre', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore debug publishing errors
    }
  };

  const queueDebugPublish = () => {
    if (debugPublishTimer.current != null || typeof window === 'undefined') return;
    debugPublishTimer.current = window.setTimeout(() => {
      debugPublishTimer.current = null;
      publishDebug();
    }, 1000);
  };

  const updateDebug = (patch: Partial<typeof debugInfo>) => {
    debugInfoRef.current = { ...debugInfoRef.current, ...patch };
    if (debugEnabled) {
      setDebugInfo((prev) => ({ ...prev, ...patch }));
    }
    queueDebugPublish();
  };

  useEffect(() => {
    if (!debugEnabled) return;
    debugInfoRef.current = { ...INITIAL_DEBUG_INFO };
    setDebugInfo({ ...INITIAL_DEBUG_INFO });
  }, [debugEnabled]);

  useEffect(() => {
    queueDebugPublish();
  }, [pmtilesKind, packError, packLayers, mapUnsupported, initTimeout, initReason, mapError]);

  useEffect(() => {
    stateSnapshotRef.current = {
      pmtilesKind,
      packError,
      packLayersCount: Array.isArray(packLayers) ? packLayers.length : null,
      mapUnsupported,
      initTimeout,
      initReason,
      mapError: mapError?.message || null,
    };
  }, [pmtilesKind, packError, packLayers, mapUnsupported, initTimeout, initReason, mapError]);

  useEffect(() => () => {
    if (debugPublishTimer.current != null) {
      window.clearTimeout(debugPublishTimer.current);
      debugPublishTimer.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMbtiles = async () => {
      try {
        const res = await fetch(MBTILES_STATUS_URL, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setMbtilesReady(Boolean(data.exists));
          setMbtilesMeta(data);
        }
      } catch {
        // ignore mbtiles errors
      }
    };
    loadMbtiles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLibs = async () => {
      try {
        guardLog('libs:loading');
        const [maplibreMod, pmtilesMod, workerMod] = await Promise.all([
          import('maplibre-gl'),
          import('pmtiles'),
          import('../../maplibreWorker?worker'),
        ]);
        if (cancelled) return;
        const maplibregl = (maplibreMod as any).default || maplibreMod;
        const workerClass = (workerMod as any).default || workerMod;
        maplibregl.workerClass = workerClass;
        libsRef.current = {
          maplibregl,
          Protocol: (pmtilesMod as any).Protocol,
          PMTiles: (pmtilesMod as any).PMTiles,
          TileType: (pmtilesMod as any).TileType,
        };
        const webglOk = detectWebglSupport();
        const libSupported = typeof maplibregl.supported === 'function'
          ? maplibregl.supported({ failIfMajorPerformanceCaveat: false })
          : webglOk;
        const hasWorker = typeof window !== 'undefined' && 'Worker' in window;
        const workerOk = libSupported && hasWorker && Boolean(maplibregl.workerClass);
        if (workerOk && !workerReadyRef.current) {
          workerReadyRef.current = true;
          setWorkerReady(true);
        }
        setMapUnsupported(!(webglOk && libSupported));
        setLibsReady(true);
        guardLog('libs:ready', { webglOk, libSupported });
      } catch (err) {
        if (!cancelled) {
          setMapError(err instanceof Error ? err : new Error('maplibre_init_failed'));
        }
      }
    };
    loadLibs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      const el = containerRef.current;
      if (!el) {
        raf = window.requestAnimationFrame(check);
        return;
      }
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      const prev = stableSizeRef.current;
      const sizeOk = w > 200 && h > 200;
      if (sizeOk && prev && prev.w === w && prev.h === h) {
        stableFramesRef.current += 1;
      } else {
        stableFramesRef.current = sizeOk ? 1 : 0;
      }
      stableSizeRef.current = { w, h };
      const ready = sizeOk && stableFramesRef.current >= 2;
      setContainerReady((prevReady) => (prevReady !== ready ? ready : prevReady));
      raf = window.requestAnimationFrame(check);
    };
    raf = window.requestAnimationFrame(check);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!libsReady) return;
    if (packInitRef.current) return;
    packInitRef.current = true;
    const packId = FIXED_PACK_ID;
    setPackError(null);
    setPmtilesKind(null);
    setPackHeader(null);
    setPackLayers(null);
    setInitTimeout(false);
    setInitReason(null);
    const libs = libsRef.current;
    if (!libs) return;
    const httpUrl = buildHttpUrl(packId);
    const runtime = !mapUnsupported ? ensureMapLibreRuntime(libs) : null;
    if (runtime?.protocol) {
      protocolRef.current = runtime.protocol;
    }
    let pmtiles = runtime?.pmtilesRegistry.get(httpUrl);
    if (!pmtiles) {
      pmtiles = new libs.PMTiles(httpUrl);
      runtime?.pmtilesRegistry.set(httpUrl, pmtiles);
    }
    const registered = runtime?.protocol ? runtime.protocol.get(httpUrl) : null;
    if (!mapUnsupported && runtime?.protocol && !registered) {
      runtime.protocol.add(pmtiles);
    }
    let cancelled = false;
    guardLog('pack:header', httpUrl);
    pmtiles
      .getHeader()
      .then((header: any) => {
        if (cancelled) return;
        if (!header) {
          setPackError('pack_unavailable');
          return;
        }
        setPackHeader(header);
        const kind = header.tileType === libs.TileType.Mvt ? 'vector' : 'raster';
        setPmtilesKind(kind);
        if (kind === 'raster') {
          setPackLayers([]);
        }
        guardLog('pack:header_loaded', { kind });
        window.setTimeout(queueDebugPublish, 0);
      })
      .catch(() => {
        if (cancelled) return;
        setPmtilesKind(null);
        setPackHeader(null);
        if (mbtilesReady) {
          setPackError(null);
          setPmtilesKind('mbtiles');
          setPackLayers([]);
        } else {
          setPackError('pack_unavailable');
        }
      });
    pmtiles
      .getMetadata()
      .then((metadata: any) => {
        if (cancelled) return;
        const layers = extractVectorLayers(metadata);
        setPackLayers(layers);
        console.log('[MapLibre] pack:layer_names', layers);
        guardLog('pack:layers', { count: layers.length });
        window.setTimeout(queueDebugPublish, 0);
      })
      .catch(() => {
        if (cancelled) return;
        setPackLayers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [libsReady, mapUnsupported, mbtilesReady]);

  useEffect(() => {
    if (!mbtilesReady) return;
    if (!packError || pmtilesKind) return;
    setPackError(null);
    setPmtilesKind('mbtiles');
    setPackLayers([]);
  }, [mbtilesReady, packError, pmtilesKind]);

  useEffect(() => {
    if (pmtilesKind !== 'vector') return;
    if (packLayers !== null) return;
    const timer = window.setTimeout(() => {
      setPackLayers([]);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [pmtilesKind, packLayers]);

  useEffect(() => {
    if (!libsReady || mapUnsupported) return;
    if (!workerReadyRef.current) {
      if (!workerWarnedRef.current) {
        console.warn('[MapLibre] worker not ready, delaying init');
        workerWarnedRef.current = true;
      }
      return;
    }
    if (mapRef.current) {
      guardLog('init:reuse');
      return;
    }
    if (!containerReady) {
      guardLog('init:skip', 'container_not_ready');
      return;
    }
    const packId = FIXED_PACK_ID;
    if (!pmtilesKind || packError) {
      guardLog('init:skip', 'pack_not_ready');
      return;
    }
    if (pmtilesKind === 'vector' && !Array.isArray(packLayers)) {
      guardLog('init:skip', 'layers_pending');
      return;
    }
    const sizeSnapshot = stableSizeRef.current;
    if (!sizeSnapshot || sizeSnapshot.w <= 200 || sizeSnapshot.h <= 200) {
      guardLog('init:skip', 'size_unstable');
      return;
    }
    const libs = libsRef.current;
    if (!libs) return;
    const runtime = ensureMapLibreRuntime(libs);
    if (runtime?.protocol) {
      protocolRef.current = runtime.protocol;
    }

    let packCenter: [number, number] | null = null;
    let packBounds: [[number, number], [number, number]] | null = null;
    if (pmtilesKind === 'mbtiles' && mbtilesMeta) {
      const bounds = Array.isArray(mbtilesMeta.bounds) ? mbtilesMeta.bounds : null;
      if (bounds && bounds.length === 4) {
        packBounds = [[bounds[0], bounds[1]], [bounds[2], bounds[3]]];
      }
      const center = Array.isArray(mbtilesMeta.center) ? mbtilesMeta.center : null;
      if (center && center.length >= 2) {
        packCenter = [center[0], center[1]];
      } else if (packBounds) {
        const westCenter = (packBounds[0][0] + packBounds[1][0]) / 2;
        const southCenter = (packBounds[0][1] + packBounds[1][1]) / 2;
        packCenter = [westCenter, southCenter];
      }
    } else if (packHeader) {
      const west = Number(packHeader.minLon ?? packHeader.min_lon);
      const east = Number(packHeader.maxLon ?? packHeader.max_lon);
      const south = Number(packHeader.minLat ?? packHeader.min_lat);
      const north = Number(packHeader.maxLat ?? packHeader.max_lat);
      if ([west, east, south, north].every((v) => Number.isFinite(v))) {
        packBounds = [[west, south], [east, north]];
      }
      const headerLon = Number(packHeader.centerLon);
      const headerLat = Number(packHeader.centerLat);
      if (Number.isFinite(headerLon) && Number.isFinite(headerLat)) {
        packCenter = [headerLon, headerLat];
      } else if (packBounds) {
        const westCenter = (packBounds[0][0] + packBounds[1][0]) / 2;
        const southCenter = (packBounds[0][1] + packBounds[1][1]) / 2;
        packCenter = [westCenter, southCenter];
      }
    }

    const center = packCenter ?? [78.9629, 20.5937];
    const packZoom = packHeader && Number.isFinite(Number(packHeader.centerZoom)) ? Number(packHeader.centerZoom) : null;
    const headerMaxZoom = Number(packHeader?.maxZoom ?? packHeader?.max_zoom);
    const mbMaxZoom = mbtilesMeta && Number.isFinite(Number(mbtilesMeta.maxzoom)) ? Number(mbtilesMeta.maxzoom) : null;
    const maxZoom = Number.isFinite(headerMaxZoom) ? Math.min(headerMaxZoom, 16) : Number.isFinite(mbMaxZoom) ? Math.min(mbMaxZoom, 18) : 16;
    const zoom = packZoom ?? 6;

    const pmtilesUrl = buildPmtilesUrl(packId);
    const style = INITIAL_STYLE;
    const sourceSpec = pmtilesKind === 'mbtiles'
      ? { type: 'raster', tiles: [MBTILES_TILE_URL], tileSize: 256 }
      : pmtilesKind === 'raster'
        ? { type: 'raster', url: pmtilesUrl, tileSize: 256 }
        : { type: 'vector', url: pmtilesUrl };
    const layerDefs = pmtilesKind === 'mbtiles' || pmtilesKind === 'raster'
      ? [buildRasterLayer()]
      : buildVectorLayers(packLayers);
    const finalStyle = buildStyle(sourceSpec, layerDefs);

    console.log('[MapLibre] style:sources', Object.keys((finalStyle as any).sources || {}));
    console.log('[MapLibre] style:layers', ((finalStyle as any).layers || []).length);

    guardLog('init:create', { center, zoom, maxZoom, packId });
    try {
      const map = new libs.maplibregl.Map({
        container: containerRef.current as HTMLElement,
        style,
        center,
        zoom,
        maxZoom,
        attributionControl: false,
        interactive: true,
      });
      mapRef.current = map;
      map.on('error', (e: any) => console.error('[MapLibre] map:error', e?.error || e));
      map.on('styledata', () => console.log('[MapLibre] evt:styledata'));
      map.on('sourcedata', (e: any) => {
        if (e?.sourceId) console.log('[MapLibre] evt:sourcedata', e.sourceId, e.isSourceLoaded);
      });
      map.on('load', () => console.log('[MapLibre] evt:load'));
      map.on('idle', () => console.log('[MapLibre] evt:idle'));
      initialViewRef.current = { center, zoom, maxZoom };
      const canvas = map.getCanvas();
      updateDebug({
        initOk: true,
        canvasW: canvas?.width ?? 0,
        canvasH: canvas?.height ?? 0,
        webgl: Boolean((map as any)?.painter?.context?.gl),
      });
      publishDebug();
      setInitTimeout(false);
      setInitReason(null);
      setRenderStalled(false);
      setRenderFailed(false);
      renderedRef.current = false;
      styleAppliedRef.current = false;
      sawRenderRef.current = false;
      styleLoadedRef.current = false;
      sourceLoadedRef.current = false;
      firstFrameKickRef.current = false;
      recoveryAttemptRef.current = 0;
      styleSetCountRef.current = 0;

      const forceRenderCycle = () => {
        if (!mapRef.current) return;
        const initial = initialViewRef.current;
        recoveryAttemptRef.current += 1;
        map.resize();
        if (initial) {
          map.jumpTo({ center: initial.center, zoom: initial.zoom });
        }
        map.triggerRepaint();
        const attempt = recoveryAttemptRef.current;
        window.setTimeout(() => {
          if (!renderedRef.current && attempt < 2) {
            forceRenderCycle();
          }
        }, 1500);
      };

      const scheduleStallCheck = () => {
        if (recoveryTimerRef.current != null) return;
        recoveryTimerRef.current = window.setTimeout(() => {
          recoveryTimerRef.current = null;
          const canvasOk = debugInfoRef.current.canvasW > 200 && debugInfoRef.current.canvasH > 200;
          if (styleLoadedRef.current && sourceLoadedRef.current && canvasOk && !renderedRef.current) {
            setRenderStalled(true);
            forceRenderCycle();
            if (failureTimerRef.current == null) {
              failureTimerRef.current = window.setTimeout(() => {
                failureTimerRef.current = null;
                if (!renderedRef.current) {
                  setRenderFailed(true);
                  updateDebug({ lastError: 'render_stalled' });
                }
              }, 5000);
            }
          }
        }, 2000);
      };

      const onFinalLoad = () => {
        styleLoadedRef.current = true;
        updateDebug({ styleLoaded: true });
        if (map.isSourceLoaded('pm')) {
          sourceLoadedRef.current = true;
          updateDebug({ sourceLoaded: true });
        }
        try {
          map.fitBounds([[58, 0], [106, 40]], { padding: 20, duration: 0, maxZoom: 6 });
        } catch {}
        if (!markerAddedRef.current) {
          markerAddedRef.current = true;
          try {
            new libs.maplibregl.Marker({ color: '#ff0000' })
              .setLngLat([77.1025, 28.7041])
              .addTo(map);
          } catch {}
        }
        if (!firstFrameKickRef.current) {
          firstFrameKickRef.current = true;
          forceRenderCycle();
          scheduleStallCheck();
        }
      };
      const applyStyleOnce = () => {
        if (styleAppliedRef.current) {
          guardLog('style:skip');
          return;
        }
        if (!map.isStyleLoaded()) return;
        map.setStyle(finalStyle as any);
        styleAppliedRef.current = true;
        styleSetCountRef.current += 1;
        console.log('[MapLibre] setStyle applied');
        updateDebug({ styleSetCount: styleSetCountRef.current });
        guardLog('style:set');
        map.once('load', onFinalLoad);
      };
      const onSourceData = (evt: any) => {
        if (evt?.sourceId === 'pm' && evt?.isSourceLoaded) {
          sourceLoadedRef.current = true;
          updateDebug({ sourceLoaded: true });
          if (styleLoadedRef.current && !firstFrameKickRef.current) {
            firstFrameKickRef.current = true;
            forceRenderCycle();
            scheduleStallCheck();
          }
        }
      };
      const onRender = () => {
        if (map.isStyleLoaded()) {
          sawRenderRef.current = true;
          const c = map.getCanvas();
          updateDebug({
            canvasW: c?.width ?? 0,
            canvasH: c?.height ?? 0,
            webgl: Boolean((map as any)?.painter?.context?.gl),
          });
        }
      };
      const onStyleData = () => {
        if (styleAppliedRef.current && map.isStyleLoaded() && !styleLoadedRef.current) {
          styleLoadedRef.current = true;
          updateDebug({ styleLoaded: true });
        }
      };
      const onIdle = () => {
        if (sawRenderRef.current && !renderedRef.current) {
          renderedRef.current = true;
          updateDebug({ rendered: true });
          setRenderStalled(false);
          setRenderFailed(false);
          publishDebug();
        }
      };
      const onError = (evt: any) => {
        const msg = evt?.error?.message || evt?.message || 'map_error';
        updateDebug({ lastError: msg });
      };

      if (map.loaded()) {
        applyStyleOnce();
      } else {
        map.once('load', applyStyleOnce);
      }
      map.on('sourcedata', onSourceData);
      map.on('styledata', onStyleData);
      map.on('render', onRender);
      map.on('idle', onIdle);
      map.on('error', onError);

      const startLoadPoller = () => {
        if (loadPollerRef.current != null) return;
        let ticks = 0;
        loadPollerRef.current = window.setInterval(() => {
          ticks += 1;
          if (!mapRef.current) {
            if (loadPollerRef.current != null) {
              window.clearInterval(loadPollerRef.current);
              loadPollerRef.current = null;
            }
            return;
          }
          const styleReady = map.isStyleLoaded();
          if (styleAppliedRef.current && styleReady && !styleLoadedRef.current) {
            styleLoadedRef.current = true;
            updateDebug({ styleLoaded: true });
          }
          if (map.isSourceLoaded('pm') && !sourceLoadedRef.current) {
            sourceLoadedRef.current = true;
            updateDebug({ sourceLoaded: true });
          }
          if (styleLoadedRef.current && sourceLoadedRef.current && !firstFrameKickRef.current) {
            firstFrameKickRef.current = true;
            forceRenderCycle();
            scheduleStallCheck();
          }
          if (ticks >= 120 || (styleLoadedRef.current && sourceLoadedRef.current)) {
            if (loadPollerRef.current != null) {
              window.clearInterval(loadPollerRef.current);
              loadPollerRef.current = null;
            }
          }
        }, 250);
      };

      startLoadPoller();

      if (packBounds) {
        const fit = () => {
          try {
            map.fitBounds(packBounds, { padding: 30, duration: 0, maxZoom });
          } catch {
            // ignore fit bounds errors
          }
        };
        if (map.loaded()) {
          fit();
        } else {
          map.once('load', fit);
        }
      }

      return () => {
        map.off('load', applyStyleOnce);
        map.off('load', onFinalLoad);
        map.off('sourcedata', onSourceData);
        map.off('styledata', onStyleData);
        map.off('render', onRender);
        map.off('idle', onIdle);
        map.off('error', onError);
        if (loadPollerRef.current != null) {
          window.clearInterval(loadPollerRef.current);
          loadPollerRef.current = null;
        }
      };
    } catch (err) {
      setMapError(err instanceof Error ? err : new Error('maplibre_init_failed'));
    }
  }, [containerReady, libsReady, mapUnsupported, pmtilesKind, packError, packLayers, packHeader, workerReady]);

  useEffect(() => {
    if (!libsReady || mapUnsupported) return;
    if (mapRef.current) return;
    const shouldInit = !!pmtilesKind && !packError;
    if (!shouldInit) {
      setInitTimeout(false);
      setInitReason(null);
      return;
    }
    setInitTimeout(false);
    const timer = window.setTimeout(() => {
      if (!mapRef.current) {
        setInitTimeout(true);
        setInitReason(packError || 'timeout');
      }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [libsReady, mapUnsupported, pmtilesKind, packError]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let raf = 0;
    const onResize = () => {
      raf = window.requestAnimationFrame(() => {
        map.resize();
      });
    };
    const observer = new ResizeObserver(() => onResize());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  if (mapUnsupported) {
    const west = Number(packHeader?.minLon ?? packHeader?.min_lon);
    const east = Number(packHeader?.maxLon ?? packHeader?.max_lon);
    const south = Number(packHeader?.minLat ?? packHeader?.min_lat);
    const north = Number(packHeader?.maxLat ?? packHeader?.max_lat);
    const boundsOk = [west, east, south, north].every((v) => Number.isFinite(v));
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div className="absolute inset-0 p-6">
          <div className="h-full w-full rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-center">
            <svg viewBox="0 0 100 60" className="w-full h-full">
              <rect x="8" y="8" width="84" height="44" rx="6" ry="6" fill="none" stroke="#334155" strokeWidth="2" />
              <rect x="12" y="12" width="76" height="36" rx="4" ry="4" fill="#0f172a" stroke="#1f2937" strokeWidth="1" />
              <circle cx="50" cy="30" r="2.5" fill="#38bdf8" />
              {boundsOk ? (
                <text x="50" y="55" textAnchor="middle" fill="#64748b" fontSize="6">
                  {`${west.toFixed(2)}°, ${south.toFixed(2)}° → ${east.toFixed(2)}°, ${north.toFixed(2)}°`}
                </text>
              ) : null}
            </svg>
          </div>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-100">
          Offline map preview (WebGL unavailable)
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-red-300 text-sm">
        <div>MapLibre failed to load</div>
        {mapError?.message ? (
          <div className="mt-1 text-[11px] text-slate-400">{mapError.message}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[260px] overflow-hidden rounded-2xl border border-slate-800">
      <div ref={containerRef} className="absolute inset-0" />
      {!effectivePackId && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-100">
          No offline map installed
        </div>
      )}
      {packError && effectivePackId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-rose-950/90 px-3 py-1 text-[11px] text-rose-100">
          Offline pack not available
        </div>
      )}
      {effectivePackId && pmtilesKind === 'vector' && Array.isArray(packLayers) && packLayers.length === 0 && !packError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-amber-950/90 px-3 py-1 text-[11px] text-amber-100">
          Offline pack loaded but no layers found
        </div>
      )}
      {initTimeout && !mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/80 px-4 py-2 text-[12px] text-rose-100">
            Map init failed ({initReason || 'timeout'})
          </div>
        </div>
      )}
      {debugEnabled && (
        <div className="absolute left-3 top-3 z-30 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px] text-slate-100">
          <div>MAP_INIT_OK: {debugInfo.initOk ? 'yes' : 'no'}</div>
          <div>STYLE_LOADED: {debugInfo.styleLoaded ? 'yes' : 'no'}</div>
          <div>SOURCE_LOADED: {debugInfo.sourceLoaded ? 'yes' : 'no'}</div>
          <div>RENDERED: {debugInfo.rendered ? 'yes' : 'no'}</div>
          <div>CANVAS {debugInfo.canvasW}x{debugInfo.canvasH}</div>
          <div>WEBGL: {debugInfo.webgl ? 'true' : 'false'}</div>
          {debugInfo.lastError ? <div>ERR: {debugInfo.lastError}</div> : null}
        </div>
      )}
      {renderStalled && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-amber-900/60 bg-amber-950/80 px-4 py-2 text-[12px] text-amber-100">
            Map initialized but render stalled — recovering…
          </div>
        </div>
      )}
      {renderFailed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/80 px-4 py-2 text-[12px] text-rose-100">
            Map render failed (styleLoaded={String(styleLoadedRef.current)} sourceLoaded={String(sourceLoadedRef.current)})
          </div>
        </div>
      )}
    </div>
  );
}
