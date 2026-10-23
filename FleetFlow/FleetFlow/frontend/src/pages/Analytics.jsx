import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowRight } from 'lucide-react';
import api from '../services/api';

const COLORS = ['#1B7A8C', '#D9A441', '#2C97AB', '#7A8699', '#C0453A', '#152840'];
const usd = (n) => `$${Math.round(n).toLocaleString()}`;

export default function Analytics() {
  const [voyageData, setVoyageData] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [fuelData, setFuelData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/analytics/voyages'),
      api.get('/analytics/maintenance'),
      api.get('/analytics/fuel'),
      api.get('/intelligence/profitability').catch(() => null),
    ])
      .then(([v, m, f, p]) => {
        setVoyageData(v.data.data);
        setMaintenanceData(m.data.data);
        setFuelData(f.data.data);
        if (p) setProfitData(p.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-navy-500 dark:text-slate-400">Loading analytics…</p>;
  if (error) return <p className="text-sm text-status-critical">{error}</p>;

  const voyagePie = voyageData.statusCounts.map((s) => ({ name: s._id, value: s.count }));
  const maintenanceBar = maintenanceData.byCategory.map((c) => ({ category: c._id, cost: c.cost, count: c.count }));
  const fuelEfficiencyBar = fuelData.byVessel.map((v) => ({ vessel: v.vesselName, efficiency: +(v.efficiency || 0).toFixed(1) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-navy-500 dark:text-slate-400">
          Voyage completion rate: <span className="font-medium text-navy-700 dark:text-slate-200">{voyageData.completionRate}%</span>
          {' · '}Total maintenance cost: <span className="font-medium text-navy-700 dark:text-slate-200">${maintenanceData.totalCost.toLocaleString()}</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
          <h2 className="text-sm font-semibold mb-3">Voyage Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={voyagePie} dataKey="value" nameKey="name" outerRadius={90} label>
                {voyagePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
          <h2 className="text-sm font-semibold mb-3">Maintenance Cost by Category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={maintenanceBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cost" fill="#D9A441" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel lg:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Fuel Efficiency by Vessel (NM per ton)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fuelEfficiencyBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="vessel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="efficiency" fill="#1B7A8C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {profitData && (
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Profitability</h2>
            <Link to="/profitability" className="text-xs font-medium text-sea-500 hover:underline inline-flex items-center gap-1">
              Full financial intelligence & What-If Simulator <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ProfitStat label="Revenue" value={usd(profitData.totals.revenue)} />
            <ProfitStat label="Cost" value={usd(profitData.totals.totalCost)} />
            <ProfitStat label="Profit" value={usd(profitData.totals.profit)} accent={profitData.totals.profit >= 0 ? 'positive' : 'negative'} />
            <ProfitStat label="Margin" value={`${profitData.totals.margin}%`} accent={profitData.totals.margin >= 0 ? 'positive' : 'negative'} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProfitStat({ label, value, accent }) {
  const color = accent === 'positive' ? 'text-status-active' : accent === 'negative' ? 'text-status-critical' : 'text-navy-900 dark:text-slate-100';
  return (
    <div>
      <p className="text-xs text-navy-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-display font-semibold ${color}`}>{value}</p>
    </div>
  );
}
