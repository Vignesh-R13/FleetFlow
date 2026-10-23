import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ship, Navigation, Wrench, AlertTriangle, Sparkles, MapPin, Fuel, Bell, Radar, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/assistant/insights').catch(() => ({ data: { data: [] } })),
    ])
      .then(([kpiRes, insightRes]) => {
        if (mounted) {
          setKpis(kpiRes.data.data);
          setInsights(insightRes.data.data);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || 'Unable to load dashboard data. Try again.');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const total = kpis?.totalVessels || 1;
  const activePercent = kpis?.fleetByStatus ? Math.round((kpis.fleetByStatus.active / total) * 100) : 0;
  const idlePercent = kpis?.fleetByStatus ? Math.round((kpis.fleetByStatus.idle / total) * 100) : 0;
  const maintPercent = kpis?.fleetByStatus ? Math.round((kpis.fleetByStatus.maintenance / total) * 100) : 0;
  const offlinePercent = kpis?.fleetByStatus ? Math.round((kpis.fleetByStatus.offline / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div>
          <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
            Fleet Dashboard
          </h1>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>Live overview of your fleet's operations, health status, and active voyages.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/command-center"
            className="ff-btn-primary text-xs"
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Open Command Center</span>
          </Link>
        </div>
      </div>

      {error ? (
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-8 text-center shadow-panel">
          <p className="text-sm font-semibold text-status-critical mb-2">{error}</p>
          <p className="text-xs text-navy-500 dark:text-slate-400">
            This usually means the backend can't reach MongoDB yet — connect a database and reload.
          </p>
        </div>
      ) : (
        <>
          {/* Top KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Vessels" value={kpis?.totalVessels} icon={Ship} accent="sea" loading={loading} />
            <StatCard label="Active Voyages" value={kpis?.activeVoyages} icon={Navigation} accent="sea" loading={loading} />
            <StatCard label="Under Maintenance" value={kpis?.underMaintenance} icon={Wrench} accent="signal" loading={loading} />
            <StatCard label="Delayed Voyages" value={kpis?.delayedVoyages} icon={AlertTriangle} accent="critical" loading={loading} />
          </div>

          {/* Fleet Health Breakdown + Fleet Utilization */}
          <div className="grid lg:grid-cols-12 gap-4">
            <div className="ff-card p-5 lg:col-span-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-slate-100">
                      Fleet Health & Distribution
                    </h2>
                  </div>
                  <span className="text-xs text-navy-500 dark:text-slate-400">
                    Total: <strong className="text-navy-900 dark:text-slate-200">{kpis?.totalVessels ?? '—'}</strong> vessels
                  </span>
                </div>

                {loading ? (
                  <div className="space-y-4 my-4">
                    <Skeleton className="h-3 w-full rounded-full" />
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-6 w-10 rounded" />
                          <Skeleton className="h-3 w-14 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Visual Segment Progress Bar */}
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-navy-950 flex overflow-hidden p-0.5 gap-0.5 my-4 border border-slate-200/80 dark:border-navy-800">
                      {activePercent > 0 && (
                        <div
                          style={{ width: `${activePercent}%` }}
                          className="bg-emerald-400 rounded-sm shadow-sm transition-all duration-500"
                          title={`Active: ${kpis?.fleetByStatus?.active || 0} (${activePercent}%)`}
                        />
                      )}
                      {idlePercent > 0 && (
                        <div
                          style={{ width: `${idlePercent}%` }}
                          className="bg-slate-400 rounded-sm shadow-sm transition-all duration-500"
                          title={`Idle: ${kpis?.fleetByStatus?.idle || 0} (${idlePercent}%)`}
                        />
                      )}
                      {maintPercent > 0 && (
                        <div
                          style={{ width: `${maintPercent}%` }}
                          className="bg-amber-400 rounded-sm shadow-sm transition-all duration-500"
                          title={`Maintenance: ${kpis?.fleetByStatus?.maintenance || 0} (${maintPercent}%)`}
                        />
                      )}
                      {offlinePercent > 0 && (
                        <div
                          style={{ width: `${offlinePercent}%` }}
                          className="bg-red-500 rounded-sm shadow-sm transition-all duration-500"
                          title={`Offline: ${kpis?.fleetByStatus?.offline || 0} (${offlinePercent}%)`}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                      <FleetStatCard
                        label="Active"
                        value={kpis?.fleetByStatus?.active ?? 0}
                        percentage={activePercent}
                        dotClass="bg-emerald-400 shadow-sm"
                        textClass="text-emerald-600 dark:text-emerald-400"
                        bgClass="bg-emerald-500/10 border-emerald-500/20"
                      />
                      <FleetStatCard
                        label="Idle"
                        value={kpis?.fleetByStatus?.idle ?? 0}
                        percentage={idlePercent}
                        dotClass="bg-slate-400 shadow-sm"
                        textClass="text-slate-600 dark:text-slate-300"
                        bgClass="bg-slate-500/10 border-slate-500/20"
                      />
                      <FleetStatCard
                        label="Maintenance"
                        value={kpis?.fleetByStatus?.maintenance ?? 0}
                        percentage={maintPercent}
                        dotClass="bg-amber-400 shadow-sm"
                        textClass="text-amber-600 dark:text-amber-400"
                        bgClass="bg-amber-500/10 border-amber-500/20"
                      />
                      <FleetStatCard
                        label="Offline"
                        value={kpis?.fleetByStatus?.offline ?? 0}
                        percentage={offlinePercent}
                        dotClass="bg-red-400 shadow-sm"
                        textClass="text-red-600 dark:text-red-400"
                        bgClass="bg-red-500/10 border-red-500/20"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="ff-card p-5 lg:col-span-4 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-slate-100 mb-2">
                  Fleet Utilization
                </h2>
                {loading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-10 w-24 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-display font-bold text-navy-900 dark:text-white">
                        {kpis?.fleetUtilization ?? 0}%
                      </p>
                      <span className="text-xs font-semibold text-teal-500 uppercase tracking-wider">
                        Operational
                      </span>
                    </div>
                    <p className="text-xs text-navy-500 dark:text-slate-400 mt-1.5">
                      of your total fleet capacity is currently deployed on active voyages.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-navy-800 flex items-center justify-between">
                <span className="text-xs text-navy-400 dark:text-slate-500">Voyage Activity</span>
                <Link
                  to="/voyages"
                  className="text-xs font-semibold text-sea-500 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                >
                  Manage Voyages <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Maritime Navigation Strip */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLinkCard
              to="/tracking"
              icon={MapPin}
              title="Live Tracking"
              description="Real-time map and vessel telemetry"
              accent="teal"
            />
            <QuickLinkCard
              to="/fuel"
              icon={Fuel}
              title="Fuel Monitoring"
              description="Consumption rates and bunkering"
              accent="amber"
            />
            <QuickLinkCard
              to="/alerts"
              icon={Bell}
              title="Fleet Alerts"
              description="Operational alerts & warnings"
              accent="red"
            />
            <QuickLinkCard
              to="/command-center"
              icon={Radar}
              title="Command Center"
              description="Risk intelligence and health scoring"
              accent="blue"
            />
          </div>

          {/* AI Intelligence Insights Panel */}
          {loading ? (
            <div className="ff-card p-5">
              <Skeleton className="h-4 w-32 rounded mb-3" />
              <div className="space-y-3">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>
          ) : (
            insights.length > 0 && (
              <div className="ff-card p-5.5 border-sea-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-slate-100">
                        AI Operational Intelligence
                      </h2>
                      <p className="text-[11px] text-navy-500 dark:text-slate-400">
                        Actionable recommendations generated from real-time fleet telematics.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/assistant"
                    className="text-xs font-semibold text-sea-500 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <span>Copilot</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {insights.map((insight, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950/70 border border-slate-200/80 dark:border-navy-800 flex items-start gap-3"
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          insight.severity === 'critical'
                            ? 'bg-status-critical shadow-glow-critical'
                            : 'bg-status-warning shadow-glow-amber'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-navy-900 dark:text-slate-100">{insight.title}</p>
                        <p className="text-xs text-navy-600 dark:text-slate-300 mt-1 leading-relaxed">{insight.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function FleetStatCard({ label, value, percentage, dotClass, textClass, bgClass }) {
  return (
    <div className={`p-3 rounded-xl border ${bgClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span className="text-[11px] font-semibold text-navy-600 dark:text-slate-300 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <p className={`text-xl font-bold font-display ${textClass}`}>{value}</p>
        <span className="text-[11px] text-navy-400 dark:text-slate-500 font-mono">{percentage}%</span>
      </div>
    </div>
  );
}

function QuickLinkCard({ to, icon: Icon, title, description, accent }) {
  const accentBorder = {
    teal: 'hover:border-teal-500/40 text-teal-400',
    amber: 'hover:border-amber-500/40 text-amber-400',
    red: 'hover:border-red-500/40 text-red-400',
    blue: 'hover:border-sky-500/40 text-sky-400',
  };

  return (
    <Link
      to={to}
      className={`ff-card p-4 transition-all duration-200 group ${accentBorder[accent] || accentBorder.teal}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 shrink-0 group-hover:scale-105 transition-transform">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-navy-900 dark:text-slate-100 flex items-center justify-between">
            <span>{title}</span>
            <ArrowRight className="w-3.5 h-3.5 text-navy-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </p>
          <p className="text-[11px] text-navy-500 dark:text-slate-400 truncate mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  );
}
