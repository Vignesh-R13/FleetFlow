import { useEffect, useState, useCallback, useMemo } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, Check, CheckCheck, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import api from '../services/api';

const SEVERITY_ICON = { Critical: AlertTriangle, Warning: AlertCircle, Info: Info };
const SEVERITY_COLOR = {
  Critical: 'text-red-500 bg-red-500/15 border-red-500/30',
  Warning: 'text-amber-500 bg-amber-500/15 border-amber-500/30',
  Info: 'text-teal-400 bg-teal-500/15 border-teal-500/30',
};
const SEVERITY_RANK = { Critical: 0, Warning: 1, Info: 2 };

const RECOMMENDED_ACTIONS = {
  'Fuel Warning': 'Review recent fuel records and compare against the voyage fuel budget.',
  'Maintenance Overdue': 'Schedule inspection immediately — see Predictive Maintenance Risk on the Maintenance page.',
  'Maintenance Due': 'Schedule the upcoming maintenance window before it becomes overdue.',
  'Voyage Delay': 'Notify stakeholders and check the voyage\'s Delay Risk on the Voyages page.',
  'Route Deviation': 'Confirm current position against the planned route.',
  'Vessel Offline': 'Attempt to re-establish contact; verify last known position on the Tracking page.',
  'Engine Warning': 'Flag for immediate engineering inspection.',
  'Low Fuel': 'Plan a refueling stop or reduce speed to conserve fuel.',
  'Incident': 'Review incident details and escalate per standard procedure.',
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [severity, setSeverity] = useState('');
  const [sortBySeverity, setSortBySeverity] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/alerts', { params: { severity, limit: 50 } });
      setAlerts(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load alerts.');
    } finally {
      setLoading(false);
    }
  }, [severity]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const displayedAlerts = useMemo(() => {
    if (!sortBySeverity) return alerts;
    return alerts.slice().sort((a, b) => {
      if ((a.status === 'Resolved') !== (b.status === 'Resolved')) return a.status === 'Resolved' ? 1 : -1;
      const rankDiff = (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [alerts, sortBySeverity]);

  async function markRead(id) {
    await api.put(`/alerts/${id}/read`);
    setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, status: 'Read' } : a)));
  }

  async function resolve(id) {
    await api.put(`/alerts/${id}/resolve`);
    setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, status: 'Resolved' } : a)));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              Alerts
            </h1>
          </div>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            Real-time critical, warning, and informational operational telemetry events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-navy-600 dark:text-slate-300 bg-slate-100 dark:bg-navy-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-navy-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sortBySeverity}
              onChange={(e) => setSortBySeverity(e.target.checked)}
              className="accent-sea-500 rounded"
            />
            <span>Prioritize by severity</span>
          </label>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['', 'Critical', 'Warning', 'Info'].map((s) => {
          const isSelected = severity === s;
          return (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-navy-900 dark:bg-sea-500 text-white shadow-sm border border-transparent'
                  : 'bg-white dark:bg-navy-900/80 border border-slate-300 dark:border-navy-700 text-navy-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800'
              }`}
            >
              {s || 'All Alerts'}
            </button>
          );
        })}
      </div>

      {/* Alerts Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ff-card p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-navy-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-200 dark:bg-navy-800 rounded" />
                <div className="h-3 w-3/4 bg-slate-200 dark:bg-navy-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="ff-card p-6 text-center text-status-critical">{error}</div>
      ) : displayedAlerts.length === 0 ? (
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-12 text-center shadow-panel">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-950 flex items-center justify-center mx-auto text-navy-400 dark:text-slate-500 mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-navy-900 dark:text-slate-100">No alerts found</h3>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            There are no operational alerts matching your filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedAlerts.map((a) => {
            const Icon = SEVERITY_ICON[a.severity] || Info;
            const recommendedAction = RECOMMENDED_ACTIONS[a.type];
            const isResolved = a.status === 'Resolved';
            const isCritical = a.severity === 'Critical';

            return (
              <div
                key={a._id}
                className={`ff-card p-4 transition-all duration-200 flex items-start gap-3.5 ${
                  isResolved
                    ? 'opacity-60 bg-slate-50/50 dark:bg-navy-950/40'
                    : isCritical
                      ? 'border-red-500/30 shadow-glow-critical/20'
                      : 'hover:border-sea-500/30'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 border ${
                    SEVERITY_COLOR[a.severity] || SEVERITY_COLOR.Info
                  } ${isCritical && !isResolved ? 'animate-pulse' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-navy-900 dark:text-slate-100">
                      {a.type}
                    </span>
                    {a.vessel?.name && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-navy-950 text-sea-500 dark:text-teal-400 border border-slate-200 dark:border-navy-800">
                        {a.vessel.name}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        a.severity === 'Critical'
                          ? 'bg-red-500/15 text-red-400'
                          : a.severity === 'Warning'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-teal-500/15 text-teal-400'
                      }`}
                    >
                      {a.severity}
                    </span>
                    {isResolved && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        Resolved
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-navy-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {a.message}
                  </p>

                  {recommendedAction && !isResolved && (
                    <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-navy-950/80 border border-slate-200/80 dark:border-navy-800 flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-navy-600 dark:text-slate-300">
                        <strong className="text-navy-900 dark:text-white font-semibold">Recommended Action:</strong>{' '}
                        {recommendedAction}
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-navy-400 dark:text-slate-500 mt-2 font-mono">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>

                {!isResolved && (
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {a.status === 'Unread' && (
                      <button
                        onClick={() => markRead(a._id)}
                        className="p-2 rounded-lg text-navy-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 border border-slate-200 dark:border-navy-700 transition-colors"
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => resolve(a._id)}
                      className="p-2 rounded-lg text-teal-500 hover:text-teal-400 hover:bg-teal-500/10 border border-teal-500/30 transition-colors"
                      aria-label="Resolve"
                      title="Resolve Alert"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
