import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import HealthScore from '../components/HealthScore';
import RiskBadge from '../components/RiskBadge';

const TABS = ['Overview', 'Current Voyage', 'Fuel', 'Maintenance', 'Cargo'];

export default function VesselDetails() {
  const { id } = useParams();
  const [vessel, setVessel] = useState(null);
  const [voyages, setVoyages] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuel, setFuel] = useState(null);
  const [maintenanceRisk, setMaintenanceRisk] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/vessels/${id}`),
      api.get('/voyages', { params: { vessel: id, limit: 20 } }),
      api.get('/maintenance', { params: { vessel: id, limit: 20 } }),
      api.get(`/fuel/${id}`).catch(() => ({ data: { data: null } })),
      api.get(`/intelligence/maintenance/${id}`).catch(() => null),
      api.get('/intelligence/fleet-health').catch(() => null),
    ])
      .then(([vRes, voyRes, maintRes, fuelRes, riskRes, healthRes]) => {
        setVessel(vRes.data.data);
        setVoyages(voyRes.data.data);
        setMaintenance(maintRes.data.data);
        setFuel(fuelRes.data.data);
        if (riskRes) setMaintenanceRisk(riskRes.data.data);
        if (healthRes) {
          const match = healthRes.data.data.vessels.find((v) => String(v.vesselId) === id);
          if (match) setHealthScore(match.overall);
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load vessel.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-navy-500 dark:text-slate-400">Loading vessel…</p>;
  if (error) return <p className="text-sm text-status-critical">{error}</p>;
  if (!vessel) return null;

  const currentVoyage = voyages.find((v) => ['Departed', 'In Transit', 'Loading', 'Delayed'].includes(v.status));

  return (
    <div className="space-y-5">
      <Link to="/fleet" className="inline-flex items-center gap-1.5 text-sm text-navy-500 dark:text-slate-400 hover:text-sea-500">
        <ArrowLeft className="w-4 h-4" /> Back to fleet
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{vessel.name}</h1>
          <p className="text-sm text-navy-500 dark:text-slate-400">IMO {vessel.imoNumber} · {vessel.type}</p>
        </div>
        <StatusBadge status={vessel.status} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat label="Speed" value={`${vessel.currentSpeed?.toFixed?.(1) ?? 0} kn`} />
        <MiniStat label="Fuel" value={vessel.fuelCapacity ? `${Math.round((vessel.currentFuel / vessel.fuelCapacity) * 100)}%` : '—'} />
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-4 shadow-panel">
          {healthScore != null ? <HealthScore score={healthScore} /> : <p className="text-lg font-display font-semibold">—</p>}
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">Health Score</p>
        </div>
        <MiniStat label="Year Built" value={vessel.yearBuilt || '—'} />
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-navy-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-sea-500 text-sea-500' : 'border-transparent text-navy-500 dark:text-slate-400 hover:text-navy-700 dark:hover:text-slate-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
        {tab === 'Overview' && (
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <Detail label="Flag" value={vessel.flag} />
            <Detail label="Engine type" value={vessel.engineType} />
            <Detail label="Capacity" value={vessel.capacity?.toLocaleString()} />
            <Detail label="Fuel capacity" value={`${vessel.fuelCapacity} t`} />
            <Detail label="Current fuel" value={`${vessel.currentFuel?.toFixed?.(1) ?? 0} t`} />
            <Detail label="Heading" value={`${Math.round(vessel.currentHeading ?? 0)}°`} />
            <Detail label="Last position update" value={vessel.lastLocationUpdate ? new Date(vessel.lastLocationUpdate).toLocaleString() : '—'} />
          </dl>
        )}

        {tab === 'Current Voyage' && (
          currentVoyage ? (
            <div>
              <Link to={`/voyages/${currentVoyage._id}`} className="font-medium text-sea-500 hover:underline">
                {currentVoyage.origin} → {currentVoyage.destination}
              </Link>
              <p className="text-sm text-navy-500 dark:text-slate-400 mt-1">
                {currentVoyage.distanceTravelled?.toLocaleString()} / {currentVoyage.distance?.toLocaleString()} NM travelled
              </p>
              <div className="mt-2"><StatusBadge status={currentVoyage.status} /></div>
            </div>
          ) : (
            <p className="text-sm text-navy-500 dark:text-slate-400">No active voyage right now.</p>
          )
        )}

        {tab === 'Fuel' && (
          fuel ? (
            <div className="grid grid-cols-2 gap-4">
              <MiniStat label="Efficiency" value={fuel.efficiency != null ? `${fuel.efficiency} NM/t` : '—'} />
              <MiniStat label="Records" value={fuel.records.length} />
            </div>
          ) : (
            <p className="text-sm text-navy-500 dark:text-slate-400">No fuel records yet.</p>
          )
        )}

        {tab === 'Maintenance' && (
          <div className="space-y-4">
            {maintenanceRisk && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-navy-800 border-l-2 border-signal-500">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-signal-600 shrink-0" />
                  <span className="text-sm font-medium">Predictive Maintenance Risk</span>
                  <RiskBadge score={maintenanceRisk.score} label={maintenanceRisk.level} />
                </div>
                <ul className="list-disc list-inside text-sm text-navy-600 dark:text-slate-300 space-y-0.5 mb-2">
                  {maintenanceRisk.factors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <p className="text-xs text-navy-500 dark:text-slate-400">
                  <span className="font-medium">Recommended:</span> {maintenanceRisk.recommendedAction}
                </p>
              </div>
            )}
            {maintenance.length === 0 ? (
              <p className="text-sm text-navy-500 dark:text-slate-400">No maintenance history.</p>
            ) : (
              <ul className="space-y-2">
                {maintenance.map((m) => (
                  <li key={m._id} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-navy-800 pb-2 last:border-0">
                    <span>{m.title}</span>
                    <StatusBadge status={m.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'Cargo' && (
          <p className="text-sm text-navy-500 dark:text-slate-400">
            See the <Link to="/cargo" className="text-sea-500 hover:underline">Cargo</Link> page and filter by this vessel's voyages.
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-4 shadow-panel">
      <p className="text-lg font-display font-semibold">{value}</p>
      <p className="text-xs text-navy-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-navy-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium">{value ?? '—'}</dd>
    </div>
  );
}
