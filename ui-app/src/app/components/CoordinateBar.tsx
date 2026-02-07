type Props = {
  lat: number | null;
  lon: number | null;
  onClear?: () => void;
};

export function CoordinateBar({ lat, lon, onClear }: Props) {
  if (lat == null || lon == null) return null;

  const latLabel = lat.toFixed(6);
  const lonLabel = lon.toFixed(6);

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[260px] -translate-x-1/2">
      <div className="pointer-events-auto rounded-xl border-2 border-blue-500/80 bg-white/95 px-4 py-3 text-center shadow-lg">
        <div className="text-[13px] font-semibold text-slate-800">Clicked Location</div>
        <div className="mt-2 text-[12px] text-slate-700">
          Latitude: <span className="font-semibold">{latLabel}</span>
        </div>
        <div className="text-[12px] text-slate-700">
          Longitude: <span className="font-semibold">{lonLabel}</span>
        </div>
        {onClear ? (
          <button
            className="mt-2 text-[11px] text-blue-600 underline"
            onClick={onClear}
          >
            Hide
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default CoordinateBar;
