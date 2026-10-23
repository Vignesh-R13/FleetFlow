import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Percent, Ship, Sliders, RotateCcw } from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import { SkeletonCard, SkeletonRow } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const COLORS = ['#1B7A8C', '#D9A441', '#2C97AB', '#7A8699', '#C0453A'];
const usd = (n) => `$${Math.round(n).toLocaleString()}`;

export default function Profitability() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/intelligence/profitability')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load profitability data.'))
      .finally(() => setLoading(false));
  }, []);

  const costPie = data
    ? Object.entries(data.totals.costBreakdown).map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-display">Profitability</h1>
        <p className="text-sm text-navy-500 dark:text-slate-400">
          Financial intelligence built from real voyage distances and fuel records, layered with clearly-labeled cost assumptions.
        </p>
      </div>

      {error ? (
        <div className="ff-card p-6 text-center">
          <p className="text-sm text-status-critical">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading || !data ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <StatCard label="Estimated Revenue" value={usd(data.totals.revenue)} icon={DollarSign} accent="sea" />
                <StatCard label="Operating Cost" value={usd(data.totals.totalCost)} icon={TrendingDown} accent="signal" />
                <StatCard label="Estimated Profit" value={usd(data.totals.profit)} icon={TrendingUp} accent={data.totals.profit >= 0 ? 'sea' : 'critical'} />
                <StatCard label="Profit Margin" value={`${data.totals.margin}%`} icon={Percent} accent={data.totals.margin >= 0 ? 'sea' : 'critical'} />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {loading || !data ? (
              <>
                <SkeletonCard /><SkeletonCard />
              </>
            ) : (
              <>
                <StatCard label="Cost / Voyage" value={usd(data.totals.costPerVoyage)} icon={Ship} accent="sea" />
                <StatCard label="Cost / Vessel" value={usd(data.totals.costPerVessel)} icon={Ship} accent="sea" />
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 ff-card p-5">
              <SectionHeader title="Revenue, Cost & Profit Trend" subtitle="By voyage departure month" accent="sea" />
              {loading || !data ? (
                <SkeletonCard className="h-64" />
              ) : data.trend.length === 0 ? (
                <EmptyState icon={TrendingUp} title="Not enough voyage history yet" description="Trends appear once voyages span more than one month." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => usd(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1B7A8C" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cost" name="Cost" stroke="#C0453A" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#D9A441" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-4 ff-card p-5">
              <SectionHeader title="Cost Breakdown" subtitle="Fleet-wide" accent="signal" />
              {loading || !data ? (
                <SkeletonCard className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={costPie} dataKey="value" nameKey="name" outerRadius={85} label={(d) => d.name}>
                      {costPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => usd(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <WhatIfSimulator voyages={data?.voyages || []} />

          <div className="ff-card p-5">
            <SectionHeader title="Voyage Profitability" subtitle="Ranked highest profit first" accent="sea" />
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-navy-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-800">
                    <th className="px-5 py-2 font-medium">Voyage</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Revenue</th>
                    <th className="px-3 py-2 font-medium">Cost</th>
                    <th className="px-3 py-2 font-medium">Profit</th>
                    <th className="px-5 py-2 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={6} />)
                  ) : !data || data.voyages.length === 0 ? (
                    <tr><td colSpan={6}><EmptyState icon={Ship} title="No voyages yet" /></td></tr>
                  ) : (
                    data.voyages.map((v) => (
                      <tr key={v.voyageId} className="border-b border-slate-100 dark:border-navy-800 last:border-0 hover:bg-slate-50 dark:hover:bg-navy-800/50">
                        <td className="px-5 py-2.5">
                          <Link to={`/voyages/${v.voyageId}`} className="font-medium hover:text-sea-500">{v.vessel}</Link>
                          <p className="text-xs text-navy-400 dark:text-slate-500">{v.route}</p>
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge status={v.status} /></td>
                        <td className="px-3 py-2.5 tabular-nums">{usd(v.revenue)}</td>
                        <td className="px-3 py-2.5 tabular-nums text-navy-500 dark:text-slate-400">{usd(v.totalCost)}</td>
                        <td className={`px-3 py-2.5 tabular-nums font-medium ${v.profit >= 0 ? 'text-status-active' : 'text-status-critical'}`}>{usd(v.profit)}</td>
                        <td className="px-5 py-2.5 tabular-nums">{v.margin}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-navy-400 dark:text-slate-500 mt-3">
              Revenue and cost figures are estimates built from real voyage distance and fuel data combined with
              configurable assumptions (see the What-If Simulator above for the exact rates used) — not live financial records.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function WhatIfSimulator({ voyages }) {
  const [voyageId, setVoyageId] = useState('');
  const [current, setCurrent] = useState(null);
  const [simulated, setSimulated] = useState(null);
  const [loading, setLoading] = useState(false);

  const [fuelPricePerTon, setFuelPricePerTon] = useState(620);
  const [revenuePerNauticalMile, setRevenuePerNauticalMile] = useState(42);
  const [distanceMultiplier, setDistanceMultiplier] = useState(1);
  const [fuelMultiplier, setFuelMultiplier] = useState(1);
  const [operatingCostMultiplier, setOperatingCostMultiplier] = useState(1);

  useEffect(() => {
    if (voyages.length > 0 && !voyageId) setVoyageId(voyages[0].voyageId);
  }, [voyages, voyageId]);

  const runSimulation = useCallback(async () => {
    if (!voyageId) return;
    setLoading(true);
    try {
      const [currentRes, simulatedRes] = await Promise.all([
        api.get(`/intelligence/profitability/${voyageId}`),
        api.get(`/intelligence/profitability/${voyageId}`, {
          params: {
            fuelPricePerTon,
            revenuePerNauticalMile,
            operatingCostMultiplier,
            // distance/fuel multipliers are applied client-side against the base voyage
            // values returned by the "current" call, then sent as absolute overrides.
          },
        }),
      ]);
      setCurrent(currentRes.data.data);

      // Apply distance/fuel multipliers as absolute overrides derived from the real voyage data.
      const baseDistance = currentRes.data.data.inputs.distance;
      const baseFuel = currentRes.data.data.inputs.fuelTons;
      const finalRes = await api.get(`/intelligence/profitability/${voyageId}`, {
        params: {
          fuelPricePerTon,
          revenuePerNauticalMile,
          operatingCostMultiplier,
          distance: Math.round(baseDistance * distanceMultiplier),
          fuelConsumed: +(baseFuel * fuelMultiplier).toFixed(1),
        },
      });
      setSimulated(finalRes.data.data);
    } catch {
      // Leave previous results in place on error — the sliders remain usable.
    } finally {
      setLoading(false);
    }
  }, [voyageId, fuelPricePerTon, revenuePerNauticalMile, distanceMultiplier, fuelMultiplier, operatingCostMultiplier]);

  useEffect(() => { runSimulation(); }, [runSimulation]);

  function resetSliders() {
    setFuelPricePerTon(620);
    setRevenuePerNauticalMile(42);
    setDistanceMultiplier(1);
    setFuelMultiplier(1);
    setOperatingCostMultiplier(1);
  }

  return (
    <div className="ff-card p-5">
      <SectionHeader
        icon={Sliders}
        title="What-If Simulator"
        subtitle="Adjust inputs and see profit recalculate instantly — deterministic arithmetic, no AI involved"
        accent="signal"
        action={
          <button onClick={resetSliders} className="text-xs text-navy-500 dark:text-slate-400 hover:text-sea-500 inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        }
      />

      {voyages.length === 0 ? (
        <EmptyState icon={Sliders} title="No voyages available to simulate" />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">Voyage</span>
              <select
                value={voyageId}
                onChange={(e) => setVoyageId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm"
              >
                {voyages.map((v) => (
                  <option key={v.voyageId} value={v.voyageId}>{v.vessel} — {v.route}</option>
                ))}
              </select>
            </label>

            <SliderField label="Fuel Price" value={fuelPricePerTon} onChange={setFuelPricePerTon} min={200} max={1200} step={10} format={(v) => `$${v}/t`} />
            <SliderField label="Revenue Rate" value={revenuePerNauticalMile} onChange={setRevenuePerNauticalMile} min={10} max={100} step={1} format={(v) => `$${v}/NM`} />
            <SliderField label="Distance" value={distanceMultiplier} onChange={setDistanceMultiplier} min={0.5} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
            <SliderField label="Fuel Consumption" value={fuelMultiplier} onChange={setFuelMultiplier} min={0.5} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
            <SliderField label="Operating Cost" value={operatingCostMultiplier} onChange={setOperatingCostMultiplier} min={0.5} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
          </div>

          <div className="grid grid-cols-2 gap-3 content-start">
            <ScenarioCard label="CURRENT" data={current} loading={loading && !current} />
            <ScenarioCard label="SIMULATED" data={simulated} loading={loading} highlight />
          </div>
        </div>
      )}
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step, format }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-navy-600 dark:text-slate-400">{label}</span>
        <span className="text-xs font-semibold text-sea-500 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sea-500"
      />
    </label>
  );
}

function ScenarioCard({ label, data, loading, highlight }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-navy-900 dark:bg-navy-950 text-white' : 'bg-slate-50 dark:bg-navy-800'}`}>
      <p className={`text-xs font-semibold tracking-wide mb-2 ${highlight ? 'text-signal-400' : 'text-navy-500 dark:text-slate-400'}`}>{label}</p>
      {loading || !data ? (
        <div className="space-y-2">
          <div className="ff-skeleton h-6 w-20 rounded" />
          <div className="ff-skeleton h-3 w-16 rounded" />
        </div>
      ) : (
        <>
          <p className={`text-2xl font-display font-semibold ${data.profit >= 0 ? (highlight ? 'text-white' : 'text-status-active') : 'text-status-critical'}`}>
            {usd(data.profit)}
          </p>
          <p className={`text-xs mt-1 ${highlight ? 'text-slate-300' : 'text-navy-500 dark:text-slate-400'}`}>Margin: {data.margin}%</p>
          <div className={`text-xs mt-2 pt-2 border-t space-y-0.5 ${highlight ? 'border-white/10 text-slate-300' : 'border-slate-200 dark:border-navy-700 text-navy-500 dark:text-slate-400'}`}>
            <p>Revenue: {usd(data.revenue)}</p>
            <p>Cost: {usd(data.totalCost)}</p>
          </div>
        </>
      )}
    </div>
  );
}
