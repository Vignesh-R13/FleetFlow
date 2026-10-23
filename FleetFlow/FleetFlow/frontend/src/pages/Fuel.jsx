import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Fuel as FuelIcon, TrendingDown, Gauge, Flame, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import SectionHeader from '../components/SectionHeader';
import ProgressBar from '../components/ProgressBar';
import { SkeletonCard } from '../components/Skeleton';

export default function Fuel() {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fleetIntel, setFleetIntel] = useState(null);
  const [fleetLoading, setFleetLoading] = useState(true);

  useEffect(() => {
    api.get('/vessels', { params: { limit: 100 } }).then((res) => {
      const v = res.data.data || [];
      setVessels(v);
      if (v.length > 0) setSelectedVessel(v[0]._id);
    });
  }, []);

  useEffect(() => {
    setFleetLoading(true);
    api.get('/intelligence/fuel')
      .then((res) => setFleetIntel(res.data.data))
      .catch(() => setFleetIntel(null))
      .finally(() => setFleetLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVessel) return;
    setLoading(true);
    setError('');
    api
      .get(`/fuel/${selectedVessel}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load fuel data.'))
      .finally(() => setLoading(false));
  }, [selectedVessel]);

  const chartData = data?.records
    ?.slice()
    .reverse()
    .map((r) => ({
      date: new Date(r.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      consumed: r.fuelConsumed,
      expected: r.expectedFuelConsumed,
      remaining: r.fuelRemaining,
    })) || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400">
              <FuelIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              Fuel Monitoring
            </h1>
          </div>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            Real-time bunker consumption rates, burn variances, and efficiency telematics
          </p>
        </div>
      </div>

      {/* Fleet Fuel Intelligence */}
      <div className="ff-card p-5">
        <SectionHeader icon={Gauge} title="Fleet Fuel Intelligence" subtitle="Telemetry aggregation and burn efficiency analysis" accent="sea" />
        {fleetLoading ? (
          <SkeletonCard className="h-24" />
        ) : !fleetIntel ? (
          <p className="text-sm text-navy-500 dark:text-slate-400">Unable to load fleet fuel intelligence.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-4">
              <FleetStat label="Total Consumption" value={`${fleetIntel.totalConsumption.toLocaleString()} t`} />
              <FleetStat label="Average Efficiency" value={`${fleetIntel.averageEfficiency} NM/t`} />
              <FleetStat label="Most Efficient" value={fleetIntel.mostEfficientVessel?.vesselName || '—'} />
              <FleetStat label="Highest Consumption" value={fleetIntel.highestConsumptionVessel?.vesselName || '—'} />
            </div>

            {fleetIntel.vesselComparison.length > 0 && (
              <div className="space-y-3 mb-4 pt-3 border-t border-slate-100 dark:border-navy-800">
                <p className="text-xs font-bold text-navy-600 dark:text-slate-300 uppercase tracking-wider">
                  Vessel Performance (relative to fleet average)
                </p>
                <div className="space-y-2">
                  {fleetIntel.vesselComparison.map((v) => (
                    <ProgressBar
                      key={v.vesselId}
                      label={v.vesselName}
                      value={v.relativeScore || 0}
                      max={140}
                      color={v.trend === 'declining' ? 'critical' : v.relativeScore >= 100 ? 'active' : 'sea'}
                    />
                  ))}
                </div>
              </div>
            )}

            {fleetIntel.warnings.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-navy-800">
                {fleetIntel.warnings.map((w) => (
                  <div key={w.vesselId} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-status-critical">
                    <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Per-Vessel Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-slate-100">
          Per-Vessel Telemetry Chart
        </h2>
        <select
          value={selectedVessel}
          onChange={(e) => setSelectedVessel(e.target.value)}
          className="ff-input sm:w-64 cursor-pointer font-medium"
        >
          {vessels.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-navy-500 dark:text-slate-400 animate-pulse">Loading fuel telemetry…</div>
      ) : error ? (
        <div className="ff-card p-8 text-center text-sm text-status-critical">{error}</div>
      ) : !data || chartData.length === 0 ? (
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-12 text-center shadow-panel">
          <FuelIcon className="w-10 h-10 mx-auto text-navy-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-bold text-navy-900 dark:text-slate-100">No fuel records for this vessel yet.</p>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">Select another vessel from the selector above.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Current Fuel Level" value={`${data.vessel.currentFuel?.toFixed?.(0) ?? 0} t`} />
            <SummaryCard label="Fuel Capacity" value={`${data.vessel.fuelCapacity} t`} />
            <SummaryCard label="Burn Efficiency" value={data.efficiency != null ? `${data.efficiency} NM/t` : '—'} />
          </div>

          <div className="ff-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-slate-100 mb-4">
              Consumption: Expected vs Actual Burn (Tonnes)
            </h3>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5C" opacity={0.25} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="#64748B" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(11, 21, 36, 0.95)',
                      borderColor: '#1E3A5C',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="consumed" name="Actual Burn (t)" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 3, fill: '#14B8A6' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="expected" name="Expected Burn (t)" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="ff-card p-4.5">
      <p className="text-xs font-semibold text-navy-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-display font-bold text-navy-900 dark:text-white mt-1.5 tabular-nums">{value}</p>
    </div>
  );
}

function FleetStat({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-navy-950/70 p-3 rounded-xl border border-slate-200/80 dark:border-navy-800">
      <p className="text-[10px] font-bold text-navy-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-base font-bold font-display text-navy-900 dark:text-white mt-1 truncate">{value}</p>
    </div>
  );
}
