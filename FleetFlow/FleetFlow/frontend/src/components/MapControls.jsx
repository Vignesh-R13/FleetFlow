import { Plus, Minus, Maximize2, Minimize2, Eye, EyeOff, Route, LocateFixed } from 'lucide-react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function MapZoomControl() {
  const map = useMap();
  return (
    <div className="flex flex-col bg-navy-950/90 dark:bg-navy-900/90 border border-navy-700/80 rounded-lg overflow-hidden shadow-lg backdrop-blur-md">
      <button
        onClick={() => map.zoomIn()}
        className="p-2 text-slate-300 hover:text-white hover:bg-navy-800/80 transition-colors"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>
      <div className="h-px bg-navy-800" />
      <button
        onClick={() => map.zoomOut()}
        className="p-2 text-slate-300 hover:text-white hover:bg-navy-800/80 transition-colors"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}

export function MapFitBoundsControl({ vessels }) {
  const map = useMap();

  function handleFit() {
    const valid = vessels.filter((v) => v.currentLatitude && v.currentLongitude);
    if (valid.length === 0) {
      map.setView([20, 60], 3);
      return;
    }
    const bounds = L.latLngBounds(valid.map((v) => [v.currentLatitude, v.currentLongitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
  }

  return (
    <button
      onClick={handleFit}
      className="p-2 bg-navy-950/90 dark:bg-navy-900/90 border border-navy-700/80 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800/80 shadow-lg backdrop-blur-md transition-colors"
      title="Fit All Vessels"
      aria-label="Fit All Vessels"
    >
      <LocateFixed className="w-4 h-4" />
    </button>
  );
}

export default function MapControls({
  vessels = [],
  showLabels,
  setShowLabels,
  showTrails,
  setShowTrails,
  isFullscreen,
  toggleFullscreen,
}) {
  const activeCount = vessels.filter((v) => v.status === 'Active').length;
  const idleCount = vessels.filter((v) => v.status === 'Idle').length;
  const maintCount = vessels.filter((v) => v.status === 'Maintenance').length;
  const offlineCount = vessels.filter((v) => v.status === 'Offline' || v.status === 'Critical').length;

  return (
    <>
      {/* Top Left: Live Simulation Badge & Count */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-auto">
        <div className="bg-navy-950/90 border border-navy-700/80 text-white rounded-xl px-3.5 py-2.5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
            <span className="text-xs font-bold tracking-wider text-teal-400 uppercase">Live Simulation</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <div>
              <span className="font-bold text-white font-mono">{vessels.length}</span>{' '}
              <span className="text-[10px] text-slate-400 uppercase">Fleet</span>
            </div>
            <span className="text-navy-700">|</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-teal-400 font-medium">{activeCount} Active</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-300 font-medium">{idleCount} Idle</span>
              <span className="text-slate-400">·</span>
              <span className="text-amber-400 font-medium">{maintCount} Maint</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Right: Map Display Action Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium backdrop-blur-md shadow-lg transition-all ${
            showLabels
              ? 'bg-sea-500/20 border-sea-400 text-teal-300 shadow-glow-teal'
              : 'bg-navy-950/90 border-navy-700/80 text-slate-300 hover:text-white hover:bg-navy-900'
          }`}
          title={showLabels ? 'Hide Vessel Labels' : 'Show Vessel Labels'}
        >
          {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Labels</span>
        </button>

        <button
          onClick={() => setShowTrails((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium backdrop-blur-md shadow-lg transition-all ${
            showTrails
              ? 'bg-sea-500/20 border-sea-400 text-teal-300 shadow-glow-teal'
              : 'bg-navy-950/90 border-navy-700/80 text-slate-300 hover:text-white hover:bg-navy-900'
          }`}
          title={showTrails ? 'Hide Vessel Trails' : 'Show Vessel Trails'}
        >
          <Route className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trails</span>
        </button>

        {toggleFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-navy-950/90 border border-navy-700/80 rounded-lg text-slate-300 hover:text-white hover:bg-navy-900 shadow-lg backdrop-blur-md transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Bottom Left: Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
        <div className="bg-navy-950/90 border border-navy-700/80 text-white rounded-lg px-3 py-2 shadow-lg backdrop-blur-md flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm"></span>
            <span className="text-slate-300">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm"></span>
            <span className="text-slate-300">Idle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></span>
            <span className="text-slate-300">Maintenance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm"></span>
            <span className="text-slate-300">Offline/Crit</span>
          </div>
        </div>
      </div>
    </>
  );
}
