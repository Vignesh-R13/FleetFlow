import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  Radar, RefreshCw, Ship, Navigation, Gauge, HeartPulse,
  AlertTriangle, Bell, Fuel, Clock, Sparkles, ArrowRight, ShieldCheck, Compass,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { timeAgo, classifyHealth } from '../utils/intelligence';
import LiveIndicator from '../components/LiveIndicator';
import StatCard from '../components/StatCard';
import HealthScore from '../components/HealthScore';
import RiskBadge from '../components/RiskBadge';
import RiskCard from '../components/RiskCard';
import StatusBadge from '../components/StatusBadge';
import Skeleton, { SkeletonCard, SkeletonRow } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import SectionHeader from '../components/SectionHeader';
import { createVesselDivIcon, getShortestAngle } from '../components/VesselMarker';

const DEFAULT_DEMO_COORDS = [
  { lat: 18.92, lng: 72.83, heading: 285, speed: 17.2 },
  { lat: 21.15, lng: 66.50, heading: 290, speed: 14.5 },
  { lat: 34.50, lng: 25.00, heading: 285, speed: 15.8 },
  { lat: 49.50, lng: -5.00, heading: 255, speed: 18.6 },
  { lat: 7.50, lng: 109.00, heading: 40, speed: 16.0 },
  { lat: -2.00, lng: 75.00, heading: 215, speed: 13.4 },
];

export default function CommandCenter() {
  const [summary, setSummary] = useState(null); // /intelligence/command-center
  const [risks, setRisks] = useState([]); // /intelligence/risks (full list)
  const [vessels, setVessels] = useState([]); // /vessels (for map positions)
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [advisor, setAdvisor] = useState(null);
  const [advisorLoading, setAdvisorLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [, forceTick] = useState(0);
  const [selectedVessel, setSelectedVessel] = useState(null);

  const { connected } = useSocket({
    'vessel:position': (update) => {
      setLastUpdated(new Date());
      setVessels((prev) =>
        prev.map((v) =>
          v._id === update.vesselId
            ? {
                ...v,
                currentLatitude: update.latitude,
                currentLongitude: update.longitude,
                currentSpeed: update.speed ?? v.currentSpeed,
                currentHeading: getShortestAngle(update.heading ?? v.currentHeading ?? 0, v.currentHeading ?? 0),
              }
            : v
        )
      );
    },
    'alert:new': () => setLastUpdated(new Date()),
  });

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, risksRes, vesselsRes, alertsRes] = await Promise.all([
        api.get('/intelligence/command-center'),
        api.get('/intelligence/risks'),
        api.get('/vessels', { params: { limit: 100 } }),
        api.get('/alerts', { params: { severity: 'Critical', status: 'Unread', limit: 5 } }),
      ]);
      setSummary(summaryRes.data.data);
      setRisks(risksRes.data.data);
      const rawVessels = vesselsRes.data.data || [];
      // If vessels lack coordinates, populate fallback positions for visual richness
      const preparedVessels = rawVessels.map((v, i) => {
        if (v.currentLatitude != null && v.currentLongitude != null) return v;
        const demo = DEFAULT_DEMO_COORDS[i % DEFAULT_DEMO_COORDS.length];
        return {
          ...v,
          currentLatitude: demo.lat,
          currentLongitude: demo.lng,
          currentHeading: v.currentHeading || demo.heading,
          currentSpeed: v.currentSpeed || demo.speed,
        };
      });
      setVessels(preparedVessels);
      setCriticalAlerts(alertsRes.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load Command Center data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    setAdvisorLoading(true);
    api
      .get('/assistant/command-summary')
      .then((res) => setAdvisor(res.data.data))
      .catch(() => setAdvisor(null))
      .finally(() => setAdvisorLoading(false));
  }, []);

  const riskByVessel = useMemo(() => {
    const map = {};
    for (const r of risks) {
      const key = String(r.vesselId);
      if (!map[key] || r.score > map[key].score) map[key] = r;
    }
    return map;
  }, [risks]);

  const rankedVessels = useMemo(() => {
    if (!summary?.health?.vessels) return [];
    return summary.health.vessels.slice().sort((a, b) => a.overall - b.overall);
  }, [summary]);

  const trackable = vessels.filter((v) => v.currentLatitude && v.currentLongitude);
  const mapCenter = trackable.length > 0 ? [trackable[0].currentLatitude, trackable[0].currentLongitude] : [20, 60];

  function handleRefresh() {
    fetchAll();
  }

  const fleetStatusColor = summary?.fleetStatus === 'Critical'
    ? 'text-status-critical'
    : summary?.fleetStatus === 'Attention Required'
      ? 'text-status-warning'
      : 'text-status-active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-glow-teal shrink-0">
            <Radar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              FleetFlow Command Center
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <LiveIndicator connected={connected} />
              <span className="text-xs text-navy-400 dark:text-slate-500">Last updated: {timeAgo(lastUpdated)}</span>
              {summary && (
                <span className={`text-xs font-semibold ${fleetStatusColor}`}>Fleet status: {summary.fleetStatus}</span>
              )}
            </div>
          </div>
        </div>

        <button onClick={handleRefresh} className="ff-btn-secondary" aria-label="Refresh Command Center data">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="ff-card p-6 text-center">
          <p className="text-sm font-medium text-status-critical mb-2">{error}</p>
          <button onClick={fetchAll} className="text-xs font-semibold text-sea-500 hover:underline">Try again</button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : summary ? (
          <>
            <StatCard label="Total Vessels" value={summary.kpis.totalVessels} icon={Ship} accent="sea" />
            <StatCard label="Active Voyages" value={summary.kpis.activeVoyages} icon={Navigation} accent="sea" />
            <StatCard label="Fleet Utilization" value={`${summary.kpis.fleetUtilization}%`} icon={Gauge} accent="sea" />
            <StatCard label="Fleet Health" value={`${summary.kpis.fleetHealth}/100`} icon={HeartPulse} accent={summary.kpis.fleetHealth >= 75 ? 'sea' : 'critical'} />
            <StatCard label="At-Risk Vessels" value={summary.kpis.atRiskVessels} icon={AlertTriangle} accent={summary.kpis.atRiskVessels > 0 ? 'critical' : 'sea'} />
            <StatCard label="Critical Alerts" value={summary.kpis.criticalAlerts} icon={Bell} accent={summary.kpis.criticalAlerts > 0 ? 'critical' : 'sea'} />
            <StatCard label="Fuel Efficiency" value={summary.kpis.fuelEfficiency != null ? `${summary.kpis.fuelEfficiency} t/100NM` : '—'} icon={Fuel} accent="signal" />
            <StatCard label="On-Time Performance" value={summary.kpis.onTimePerformance != null ? `${summary.kpis.onTimePerformance}%` : '—'} icon={Clock} accent="sea" />
          </>
        ) : null}
      </div>

      {/* Fleet Health + Vessel Health ranking */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 ff-card p-5 flex flex-col justify-between">
          <div>
            <SectionHeader icon={HeartPulse} title="Fleet Health" subtitle="Weighted score across 5 factors" accent="sea" />
            {loading ? (
              <SkeletonCard />
            ) : summary ? (
              <div className="mt-2">
                <HealthScore score={summary.health.fleetAverage} size="lg" />
                <div className="grid grid-cols-5 gap-1.5 mt-4 text-center">
                  <HealthCount label="Healthy" value={summary.health.distribution.healthy} color="text-emerald-500 dark:text-emerald-400" />
                  <HealthCount label="Good" value={summary.health.distribution.good} color="text-teal-500 dark:text-teal-400" />
                  <HealthCount label="Attention" value={summary.health.distribution.attention} color="text-amber-500 dark:text-amber-400" />
                  <HealthCount label="At Risk" value={summary.health.distribution.atRisk} color="text-orange-500 dark:text-orange-400" />
                  <HealthCount label="Critical" value={summary.health.distribution.critical} color="text-red-500 dark:text-red-400" />
                </div>
              </div>
            ) : null}
          </div>
          <p className="text-[11px] text-navy-400 dark:text-slate-500 mt-4 leading-relaxed">
            Deterministic score calculated from maintenance telemetry, fuel consumption deviation, active alerts, and voyage schedules.
          </p>
        </div>

        <div className="lg:col-span-8 ff-card p-5 overflow-hidden">
          <SectionHeader icon={Ship} title="Vessel Health Ranking" subtitle="Sorted by highest risk first" accent="sea" />
          <div className="overflow-x-auto -mx-5 mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800">
                  <th className="ff-th">Vessel</th>
                  <th className="ff-th">Health</th>
                  <th className="ff-th">Fuel</th>
                  <th className="ff-th">Maint.</th>
                  <th className="ff-th">Alerts</th>
                  <th className="ff-th">Voyage</th>
                  <th className="ff-th">Risk</th>
                  <th className="ff-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={8} />)
                ) : rankedVessels.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon={Ship} title="No vessels yet" /></td></tr>
                ) : (
                  rankedVessels.map((v) => {
                    const topRisk = riskByVessel[String(v.vesselId)];
                    return (
                      <tr key={v.vesselId} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                        <td className="ff-td font-semibold">
                          <Link to={`/fleet/${v.vesselId}`} className="hover:text-sea-500 dark:hover:text-teal-400 transition-colors">{v.name}</Link>
                        </td>
                        <td className="ff-td"><HealthScore score={v.overall} showLabel={false} /></td>
                        <td className="ff-td text-navy-500 dark:text-slate-400 tabular-nums font-mono">{v.breakdown.fuelEfficiency}</td>
                        <td className="ff-td text-navy-500 dark:text-slate-400 tabular-nums font-mono">{v.breakdown.maintenance}</td>
                        <td className="ff-td text-navy-500 dark:text-slate-400 tabular-nums font-mono">{v.activeAlertCount}</td>
                        <td className="ff-td text-navy-500 dark:text-slate-400 tabular-nums font-mono">{v.breakdown.voyageStatus}</td>
                        <td className="ff-td">{topRisk ? <RiskBadge score={topRisk.score} label={topRisk.severity} /> : <span className="text-xs text-navy-300 dark:text-navy-700">—</span>}</td>
                        <td className="ff-td"><StatusBadge status={v.status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Fleet Map + selected vessel panel */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 ff-card p-3 overflow-hidden">
          <div className="px-2 pt-2 pb-2">
            <SectionHeader icon={Radar} title="Live Fleet Map" subtitle="Simulated positions, updated via Socket.IO" accent="sea" />
          </div>
          <div className="h-[420px] rounded-lg overflow-hidden border border-slate-200/60 dark:border-navy-800">
            <MapContainer center={mapCenter} zoom={3} style={{ height: '100%', width: '100%', background: '#060D17' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {trackable.map((v) => {
                const health = summary?.health?.vessels?.find((h) => String(h.vesselId) === String(v._id));
                const icon = createVesselDivIcon({
                  status: v.status || 'Active',
                  heading: v.currentHeading || 0,
                  isSelected: selectedVessel?._id === v._id,
                  showLabel: false,
                  vesselName: v.name,
                });
                return (
                  <Marker
                    key={v._id}
                    position={[v.currentLatitude, v.currentLongitude]}
                    icon={icon}
                    eventHandlers={{ click: () => setSelectedVessel(v) }}
                  >
                    <Popup>
                      <div className="text-slate-100 min-w-[190px] p-1">
                        <p className="font-bold text-sm text-white">{v.name}</p>
                        <p className="text-xs text-teal-400 mt-0.5">Status: {v.status}</p>
                        <p className="text-xs text-slate-300 font-mono mt-0.5">Speed: {v.currentSpeed?.toFixed?.(1) ?? 0} kn</p>
                        {health && <p className="text-xs font-semibold text-emerald-400 mt-1">Health: {health.overall}/100</p>}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div className="lg:col-span-4 ff-card p-5">
          <SectionHeader icon={Ship} title="Vessel Details" accent="sea" />
          {selectedVessel ? (
            <SelectedVesselPanel
              vessel={selectedVessel}
              health={summary?.health?.vessels?.find((h) => String(h.vesselId) === String(selectedVessel._id))}
              risk={riskByVessel[String(selectedVessel._id)]}
            />
          ) : (
            <EmptyState icon={Radar} title="No vessel selected" description="Click a marker on the map to see live details." />
          )}
        </div>
      </div>

      {/* Risk Intelligence + AI Command Advisor */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 ff-card p-5">
          <SectionHeader icon={AlertTriangle} title="Risk Intelligence" subtitle="Operational risk estimate, ranked highest first" accent="signal" />
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : risks.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No elevated risks detected" description="The fleet has no active risk signals right now." />
          ) : (
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto -mx-2 pr-1 scrollbar-thin">
              {risks.slice(0, 10).map((r, i) => <RiskCard key={i} risk={r} />)}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 ff-card p-5 flex flex-col justify-between">
          <div>
            <SectionHeader icon={Sparkles} title="AI Command Advisor" subtitle="FleetFlow Copilot" accent="signal" />
            {advisorLoading ? (
              <div className="space-y-2 mt-3">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
                <Skeleton className="h-3 w-3/5 rounded" />
              </div>
            ) : advisor ? (
              <div className="text-xs sm:text-sm text-navy-700 dark:text-slate-300 whitespace-pre-line leading-relaxed mt-2 bg-slate-50 dark:bg-navy-950/70 p-3.5 rounded-xl border border-slate-200/80 dark:border-navy-800">
                {advisor.summary}
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="Advisor unavailable" description="Unable to reach the AI assistant right now." />
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-navy-800">
            <span className="text-xs text-navy-400 dark:text-slate-500">
              {advisor?.mode === 'ai' ? 'AI-generated' : 'Rule-based (no AI API configured)'}
            </span>
            <Link to="/assistant" className="text-xs font-semibold text-sea-500 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
              Ask a follow-up <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      <div className="ff-card p-5">
        <SectionHeader
          icon={Bell}
          title="Critical Alerts"
          subtitle="Unresolved, critical-severity"
          accent="critical"
          action={<Link to="/alerts" className="text-xs font-semibold text-sea-500 dark:text-teal-400 hover:underline">View all alerts</Link>}
        />
        {loading ? (
          <div className="space-y-2 mt-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : criticalAlerts.length === 0 ? (
          <EmptyState icon={Bell} title="No critical alerts" description="Nothing unresolved and critical right now." />
        ) : (
          <div className="space-y-2 mt-2">
            {criticalAlerts.map((a) => (
              <div key={a._id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                <span className="w-2.5 h-2.5 rounded-full bg-status-critical shrink-0 shadow-glow-critical animate-pulse" />
                <span className="text-xs font-bold text-red-900 dark:text-red-200">{a.vessel?.name || 'Fleet'}</span>
                <span className="text-xs text-navy-700 dark:text-slate-300 flex-1 truncate">{a.message}</span>
                <span className="text-[11px] text-navy-400 shrink-0 font-mono">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthCount({ label, value, color }) {
  return (
    <div className="bg-slate-50 dark:bg-navy-950/70 p-2 rounded-lg border border-slate-200/80 dark:border-navy-800">
      <p className={`text-base font-bold font-display ${color}`}>{value}</p>
      <p className="text-[9px] text-navy-400 dark:text-slate-400 uppercase tracking-wider truncate font-semibold">{label}</p>
    </div>
  );
}

function SelectedVesselPanel({ vessel, health, risk }) {
  return (
    <div className="space-y-3.5 mt-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-navy-900 dark:text-slate-100">{vessel.name}</h3>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
        </span>
      </div>
      <StatusBadge status={vessel.status || 'Active'} />
      <dl className="grid grid-cols-2 gap-2 text-xs pt-1">
        <Detail label="Speed" value={`${vessel.currentSpeed?.toFixed?.(1) ?? 0} kn`} />
        <Detail label="Heading" value={`${Math.round(vessel.currentHeading ?? 0)}°`} />
        <Detail label="Fuel Level" value={vessel.fuelCapacity ? `${Math.round((vessel.currentFuel / vessel.fuelCapacity) * 100)}%` : '—'} />
        <Detail label="Health Score" value={health ? `${health.overall}/100` : '—'} />
      </dl>
      {risk && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-navy-800">
          <p className="text-[11px] font-semibold text-navy-500 dark:text-slate-400 uppercase tracking-wider mb-1">Top Risk Signal</p>
          <div className="flex items-center gap-2">
            <RiskBadge score={risk.score} label={risk.severity} />
            <p className="text-xs font-semibold text-navy-800 dark:text-slate-200 truncate">{risk.title}</p>
          </div>
        </div>
      )}
      <div className="pt-2">
        <Link to={`/fleet/${vessel._id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-sea-500 dark:text-teal-400 hover:underline">
          <span>Full vessel operations view</span> <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-navy-950/70 p-2 rounded-lg border border-slate-200/80 dark:border-navy-800">
      <dt className="text-[10px] uppercase tracking-wider font-semibold text-navy-400 dark:text-slate-400">{label}</dt>
      <dd className="font-bold text-navy-900 dark:text-white font-mono mt-0.5">{value}</dd>
    </div>
  );
}
