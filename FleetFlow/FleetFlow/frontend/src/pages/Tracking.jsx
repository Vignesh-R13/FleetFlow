import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Radio, ArrowUpRight, Anchor, Navigation, Gauge, Clock, Compass, Activity, MapPin } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import StatusBadge from '../components/StatusBadge';
import { createVesselDivIcon, getShortestAngle } from '../components/VesselMarker';
import MapControls, { MapZoomControl, MapFitBoundsControl } from '../components/MapControls';
import Skeleton from '../components/Skeleton';

// Predefined realistic trade lane waypoints for demo fallback
const DEMO_TRADE_LANES = [
  {
    name: 'Arabian Sea - Gulf Express',
    waypoints: [
      { lat: 18.92, lng: 72.83, heading: 285 },
      { lat: 21.15, lng: 66.50, heading: 290 },
      { lat: 24.30, lng: 60.10, heading: 310 },
      { lat: 25.26, lng: 55.30, heading: 330 },
      { lat: 26.50, lng: 56.40, heading: 120 },
      { lat: 22.00, lng: 63.00, heading: 110 },
    ],
  },
  {
    name: 'Bay of Bengal - Malacca Line',
    waypoints: [
      { lat: 13.08, lng: 80.27, heading: 125 },
      { lat: 9.50, lng: 86.20, heading: 120 },
      { lat: 5.80, lng: 95.00, heading: 105 },
      { lat: 3.00, lng: 100.50, heading: 135 },
      { lat: 1.29, lng: 103.85, heading: 300 },
      { lat: 6.00, lng: 92.00, heading: 290 },
    ],
  },
  {
    name: 'Mediterranean Cargo Highway',
    waypoints: [
      { lat: 31.25, lng: 32.30, heading: 305 },
      { lat: 34.50, lng: 25.00, heading: 285 },
      { lat: 37.00, lng: 12.00, heading: 280 },
      { lat: 36.80, lng: 2.00, heading: 265 },
      { lat: 36.14, lng: -5.35, heading: 85 },
      { lat: 35.20, lng: 18.00, heading: 110 },
    ],
  },
  {
    name: 'North Atlantic Route',
    waypoints: [
      { lat: 51.95, lng: 4.14, heading: 260 },
      { lat: 49.50, lng: -5.00, heading: 255 },
      { lat: 46.00, lng: -30.00, heading: 250 },
      { lat: 41.50, lng: -60.00, heading: 245 },
      { lat: 40.68, lng: -74.04, heading: 70 },
      { lat: 48.00, lng: -20.00, heading: 75 },
    ],
  },
  {
    name: 'South China Sea Corridor',
    waypoints: [
      { lat: 1.29, lng: 103.85, heading: 45 },
      { lat: 7.50, lng: 109.00, heading: 40 },
      { lat: 15.00, lng: 114.50, heading: 35 },
      { lat: 22.30, lng: 114.17, heading: 215 },
      { lat: 12.00, lng: 111.00, heading: 220 },
    ],
  },
  {
    name: 'Indian Ocean Deep Route',
    waypoints: [
      { lat: 6.93, lng: 79.84, heading: 205 },
      { lat: -2.00, lng: 75.00, heading: 215 },
      { lat: -12.00, lng: 65.00, heading: 225 },
      { lat: -20.16, lng: 57.50, heading: 35 },
      { lat: -5.00, lng: 70.00, heading: 30 },
    ],
  },
];

const DEFAULT_DEMO_VESSELS = [
  { _id: 'demo-1', name: 'MV Ocean Star', type: 'Container', status: 'Active', currentSpeed: 17.2, currentHeading: 127, currentLatitude: 13.08, currentLongitude: 80.27, laneIndex: 1, wayIndex: 0, progress: 0.1 },
  { _id: 'demo-2', name: 'Nordic Voyager', type: 'Bulk Carrier', status: 'Active', currentSpeed: 14.5, currentHeading: 290, currentLatitude: 21.15, currentLongitude: 66.50, laneIndex: 0, wayIndex: 1, progress: 0.4 },
  { _id: 'demo-3', name: 'Pacific Pioneer', type: 'Oil Tanker', status: 'Active', currentSpeed: 15.8, currentHeading: 285, currentLatitude: 34.50, currentLongitude: 25.00, laneIndex: 2, wayIndex: 1, progress: 0.7 },
  { _id: 'demo-4', name: 'Atlantic Horizon', type: 'Container', status: 'Active', currentSpeed: 18.6, currentHeading: 255, currentLatitude: 49.50, currentLongitude: -5.00, laneIndex: 3, wayIndex: 1, progress: 0.2 },
  { _id: 'demo-5', name: 'Eastern Harmony', type: 'LNG Carrier', status: 'Active', currentSpeed: 16.0, currentHeading: 40, currentLatitude: 7.50, currentLongitude: 109.00, laneIndex: 4, wayIndex: 1, progress: 0.5 },
  { _id: 'demo-6', name: 'Southern Cross', type: 'General Cargo', status: 'Active', currentSpeed: 13.4, currentHeading: 215, currentLatitude: -2.00, currentLongitude: 75.00, laneIndex: 5, wayIndex: 1, progress: 0.3 },
  { _id: 'demo-7', name: 'Aegean Mariner', type: 'Bulk Carrier', status: 'Maintenance', currentSpeed: 0.0, currentHeading: 90, currentLatitude: 37.94, currentLongitude: 23.63, laneIndex: 2, wayIndex: 0, progress: 0 },
  { _id: 'demo-8', name: 'Arabian Sentinel', type: 'Tug', status: 'Idle', currentSpeed: 0.5, currentHeading: 180, currentLatitude: 25.26, currentLongitude: 55.30, laneIndex: 0, wayIndex: 3, progress: 0 },
  { _id: 'demo-9', name: 'Celtic Trader', type: 'Container', status: 'Active', currentSpeed: 16.8, currentHeading: 245, currentLatitude: 41.50, currentLongitude: -60.00, laneIndex: 3, wayIndex: 3, progress: 0.6 },
  { _id: 'demo-10', name: 'Singapore Pearl', type: 'Chemical Tanker', status: 'Active', currentSpeed: 15.1, currentHeading: 135, currentLatitude: 3.00, currentLongitude: 100.50, laneIndex: 1, wayIndex: 3, progress: 0.8 },
  { _id: 'demo-11', name: 'Gibraltar Osprey', type: 'Ro-Ro', status: 'Active', currentSpeed: 19.2, currentHeading: 265, currentLatitude: 36.80, currentLongitude: 2.00, laneIndex: 2, wayIndex: 3, progress: 0.3 },
  { _id: 'demo-12', name: 'Mauritius Wave', type: 'General Cargo', status: 'Idle', currentSpeed: 0.0, currentHeading: 45, currentLatitude: -20.16, currentLongitude: 57.50, laneIndex: 5, wayIndex: 3, progress: 0 },
];

function MapInner({ vessels, trails, showTrails, showLabels, selectedId, onSelectVessel }) {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Historical wake trails */}
      {showTrails &&
        Object.entries(trails).map(([id, points]) => {
          if (!points || points.length < 2) return null;
          const vessel = vessels.find((v) => String(v._id) === String(id));
          const color = vessel?.status === 'Maintenance' ? '#F59E0B' : vessel?.status === 'Critical' ? '#EF4444' : '#14B8A6';
          return (
            <Polyline
              key={`trail-${id}`}
              positions={points}
              pathOptions={{
                color,
                weight: 2.5,
                opacity: 0.5,
                dashArray: '4, 6',
                lineCap: 'round',
              }}
            />
          );
        })}

      {/* Vessel markers */}
      {vessels.map((v) => {
        const isSelected = String(v._id) === String(selectedId);
        const icon = createVesselDivIcon({
          status: v.status || 'Active',
          heading: v.currentHeading || 0,
          isSelected,
          showLabel: showLabels,
          vesselName: v.name,
          speed: v.currentSpeed,
        });

        return (
          <Marker
            key={v._id}
            position={[v.currentLatitude, v.currentLongitude]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectVessel(v),
            }}
          >
            <Popup>
              <div className="text-slate-100 min-w-[210px] p-1 font-sans">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-navy-700/80">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide">{v.name}</h3>
                    <p className="text-[11px] text-teal-400 font-medium">{v.type || 'Vessel'}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      v.status === 'Active'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : v.status === 'Maintenance'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-600/30 text-slate-300 border border-slate-500/30'
                    }`}
                  >
                    {v.status || 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div className="bg-navy-900/60 p-1.5 rounded border border-navy-800">
                    <span className="text-[10px] text-slate-400 uppercase block font-medium">Speed</span>
                    <span className="text-sm font-semibold text-white font-mono">
                      {v.currentSpeed?.toFixed?.(1) ?? 0} <span className="text-xs text-teal-400 font-sans">kn</span>
                    </span>
                  </div>
                  <div className="bg-navy-900/60 p-1.5 rounded border border-navy-800">
                    <span className="text-[10px] text-slate-400 uppercase block font-medium">Heading</span>
                    <span className="text-sm font-semibold text-white font-mono">
                      {Math.round(v.currentHeading ?? 0)}°
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Coordinates:</span>
                  <span className="font-mono text-slate-200">
                    {Math.abs(v.currentLatitude).toFixed(2)}°{v.currentLatitude >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(v.currentLongitude).toFixed(2)}°{v.currentLongitude >= 0 ? 'E' : 'W'}
                  </span>
                </div>

                <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Last Update:</span>
                  <span className="font-mono text-slate-300">
                    {v.lastLocationUpdate ? new Date(v.lastLocationUpdate).toLocaleTimeString() : 'Live Stream'}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-navy-700/80">
                  <Link
                    to={`/fleet/${v._id}`}
                    className="flex items-center justify-center gap-1.5 w-full bg-sea-500 hover:bg-sea-400 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors"
                  >
                    <span>View Vessel Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function Tracking() {
  const [backendVessels, setBackendVessels] = useState([]);
  const [animatedVessels, setAnimatedVessels] = useState([]);
  const [trails, setTrails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef(null);

  // Fetch initial vessel data from API
  useEffect(() => {
    let isMounted = true;
    api
      .get('/vessels', { params: { limit: 100 } })
      .then((res) => {
        if (!isMounted) return;
        const data = res.data.data || [];
        setBackendVessels(data);

        // Check if backend has valid coordinates
        const withCoords = data.filter((v) => v.currentLatitude != null && v.currentLongitude != null);
        if (withCoords.length > 0) {
          setAnimatedVessels(data);
        } else {
          // Merge backend vessel metadata with default demo coordinates
          const fallback = data.length > 0
            ? data.map((v, i) => {
                const demo = DEFAULT_DEMO_VESSELS[i % DEFAULT_DEMO_VESSELS.length];
                return {
                  ...v,
                  currentLatitude: demo.currentLatitude,
                  currentLongitude: demo.currentLongitude,
                  currentSpeed: v.currentSpeed || demo.currentSpeed,
                  currentHeading: v.currentHeading || demo.currentHeading,
                  laneIndex: demo.laneIndex,
                  wayIndex: demo.wayIndex,
                  progress: demo.progress,
                };
              })
            : DEFAULT_DEMO_VESSELS;
          setAnimatedVessels(fallback);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Unable to load vessels.');
        setAnimatedVessels(DEFAULT_DEMO_VESSELS);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update animated vessels and historical trails when real Socket.IO events arrive
  useSocket({
    'vessel:position': (update) => {
      setLiveCount((c) => c + 1);
      setAnimatedVessels((prev) =>
        prev.map((v) => {
          if (String(v._id) === String(update.vesselId)) {
            const shortestHeading = getShortestAngle(update.heading ?? v.currentHeading ?? 0, v.currentHeading ?? 0);
            return {
              ...v,
              currentLatitude: update.latitude,
              currentLongitude: update.longitude,
              currentSpeed: update.speed ?? v.currentSpeed,
              currentHeading: shortestHeading,
              lastLocationUpdate: new Date().toISOString(),
            };
          }
          return v;
        })
      );

      // Add to trails
      if (update.vesselId && update.latitude && update.longitude) {
        setTrails((prev) => {
          const existing = prev[update.vesselId] || [];
          const next = [...existing.slice(-7), [update.latitude, update.longitude]];
          return { ...prev, [update.vesselId]: next };
        });
      }
    },
  });

  // Smooth continuous simulation loop for moving ships along waypoints
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedVessels((prev) =>
        prev.map((v) => {
          if (v.status !== 'Active') return v;

          const lane = DEMO_TRADE_LANES[v.laneIndex ?? 0] || DEMO_TRADE_LANES[0];
          const waypoints = lane.waypoints;
          let wayIdx = v.wayIndex ?? 0;
          let progress = (v.progress ?? 0) + 0.04;

          if (progress >= 1) {
            progress = 0;
            wayIdx = (wayIdx + 1) % waypoints.length;
          }

          const currentWay = waypoints[wayIdx];
          const nextWay = waypoints[(wayIdx + 1) % waypoints.length];

          // Linear interpolation between waypoints
          const newLat = currentWay.lat + (nextWay.lat - currentWay.lat) * progress;
          const newLng = currentWay.lng + (nextWay.lng - currentWay.lng) * progress;

          const shortestHeading = getShortestAngle(currentWay.heading, v.currentHeading ?? currentWay.heading);

          return {
            ...v,
            currentLatitude: newLat,
            currentLongitude: newLng,
            currentHeading: shortestHeading,
            wayIndex: wayIdx,
            progress,
          };
        })
      );

      // Periodically append trail points for active vessels
      setTrails((prev) => {
        const nextTrails = { ...prev };
        animatedVessels.forEach((v) => {
          if (v.currentLatitude && v.currentLongitude && v.status === 'Active') {
            const existing = nextTrails[v._id] || [];
            if (
              existing.length === 0 ||
              Math.abs(existing[existing.length - 1][0] - v.currentLatitude) > 0.02 ||
              Math.abs(existing[existing.length - 1][1] - v.currentLongitude) > 0.02
            ) {
              nextTrails[v._id] = [...existing.slice(-8), [v.currentLatitude, v.currentLongitude]];
            }
          }
        });
        return nextTrails;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [animatedVessels]);

  const trackableVessels = useMemo(
    () => animatedVessels.filter((v) => v.currentLatitude != null && v.currentLongitude != null),
    [animatedVessels]
  );

  const defaultCenter = useMemo(() => {
    if (trackableVessels.length > 0) {
      return [trackableVessels[0].currentLatitude, trackableVessels[0].currentLongitude];
    }
    return [20, 60];
  }, [trackableVessels]);

  function toggleFullscreen() {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4 rounded-xl shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              Live Vessel Tracking
            </h1>
          </div>
          <p className="text-xs text-navy-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
            <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            {liveCount > 0 ? (
              <span className="text-teal-400 font-medium">Receiving live position updates</span>
            ) : (
              <span>Waiting for position updates…</span>
            )}{' '}
            · <span className="italic">positions are simulated, not real AIS/GPS data</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-navy-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-navy-800 text-xs">
            <Activity className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-navy-900 dark:text-slate-200">
              {trackableVessels.length} Vessels Tracked
            </span>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div
        ref={mapContainerRef}
        className={`relative bg-navy-950 border border-navy-800 rounded-xl overflow-hidden shadow-xl ${
          isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'h-[560px] w-full'
        }`}
      >
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-950/80 text-slate-300 z-50">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Initializing Maritime Operations Map…</p>
          </div>
        ) : error && trackableVessels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-950 text-status-critical p-4 z-50">
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <MapControls
              vessels={trackableVessels}
              showLabels={showLabels}
              setShowLabels={setShowLabels}
              showTrails={showTrails}
              setShowTrails={setShowTrails}
              isFullscreen={isFullscreen}
              toggleFullscreen={toggleFullscreen}
            />

            <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
              {/* Zoom and Fit buttons are dynamically tied to Leaflet */}
            </div>

            <MapContainer
              center={defaultCenter}
              zoom={3}
              minZoom={2}
              maxZoom={12}
              zoomControl={false}
              style={{ height: '100%', width: '100%', background: '#060D17' }}
            >
              <div className="leaflet-top leaflet-right" style={{ top: '65px', right: '16px' }}>
                <div className="leaflet-control flex flex-col gap-2">
                  <MapZoomControl />
                  <MapFitBoundsControl vessels={trackableVessels} />
                </div>
              </div>

              <MapInner
                vessels={trackableVessels}
                trails={trails}
                showTrails={showTrails}
                showLabels={showLabels}
                selectedId={selectedVessel?._id}
                onSelectVessel={setSelectedVessel}
              />
            </MapContainer>
          </>
        )}
      </div>

      {/* Fleet Tracking High-Density Table */}
      <div className="ff-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-sea-500 dark:text-sea-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-slate-100">
              Fleet Tracking Telemetry
            </h2>
          </div>
          <span className="text-xs text-navy-500 dark:text-slate-400">
            Showing <strong className="text-navy-900 dark:text-slate-200">{trackableVessels.length}</strong> active telemetry streams
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-navy-800">
                <th className="ff-th">Vessel</th>
                <th className="ff-th">Status</th>
                <th className="ff-th">Speed</th>
                <th className="ff-th">Heading</th>
                <th className="ff-th">Position</th>
                <th className="ff-th">Last update</th>
                <th className="ff-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800/60">
              {trackableVessels.map((v) => (
                <tr
                  key={v._id}
                  className="hover:bg-slate-50/80 dark:hover:bg-navy-800/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedVessel(v)}
                >
                  <td className="ff-td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse-subtle" />
                      <div>
                        <p className="font-semibold text-navy-900 dark:text-slate-100 group-hover:text-sea-500 dark:group-hover:text-teal-400 transition-colors">
                          {v.name}
                        </p>
                        <p className="text-[11px] text-navy-500 dark:text-slate-400">{v.type || 'Commercial Vessel'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="ff-td">
                    <StatusBadge status={v.status || 'Active'} />
                  </td>
                  <td className="ff-td font-mono font-medium text-navy-700 dark:text-slate-300">
                    {v.currentSpeed?.toFixed?.(1) ?? 0} <span className="text-xs text-navy-400">kn</span>
                  </td>
                  <td className="ff-td font-mono text-navy-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block transform transition-transform"
                        style={{ transform: `rotate(${Math.round(v.currentHeading ?? 0)}deg)` }}
                      >
                        ↑
                      </span>
                      <span>{Math.round(v.currentHeading ?? 0)}°</span>
                    </div>
                  </td>
                  <td className="ff-td font-mono text-xs text-navy-600 dark:text-slate-400">
                    {Math.abs(v.currentLatitude).toFixed(2)}°{v.currentLatitude >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(v.currentLongitude).toFixed(2)}°{v.currentLongitude >= 0 ? 'E' : 'W'}
                  </td>
                  <td className="ff-td text-xs text-navy-500 dark:text-slate-400 font-mono">
                    {v.lastLocationUpdate ? new Date(v.lastLocationUpdate).toLocaleTimeString() : 'Continuous stream'}
                  </td>
                  <td className="ff-td text-right">
                    <Link
                      to={`/fleet/${v._id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sea-500 hover:text-sea-400 dark:text-teal-400 dark:hover:text-teal-300 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
