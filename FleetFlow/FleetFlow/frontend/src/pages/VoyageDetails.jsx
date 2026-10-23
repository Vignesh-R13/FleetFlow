import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { ArrowLeft, DollarSign } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import SectionHeader from '../components/SectionHeader';

const usd = (n) => `$${Math.round(n).toLocaleString()}`;

export default function VoyageDetails() {
  const { id } = useParams();
  const [voyage, setVoyage] = useState(null);
  const [cargo, setCargo] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [delayRisk, setDelayRisk] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/voyages/${id}`),
      api.get('/cargo', { params: { voyage: id, limit: 50 } }),
      api.get('/analytics/performance', { params: { voyageId: id } }).catch(() => null),
      api.get('/intelligence/voyages').catch(() => null),
      api.get(`/intelligence/profitability/${id}`).catch(() => null),
    ])
      .then(([voyageRes, cargoRes, perfRes, voyageIntelRes, profitRes]) => {
        setVoyage(voyageRes.data.data);
        setCargo(cargoRes.data.data);
        if (perfRes) setPerformance(perfRes.data.data);
        if (voyageIntelRes) {
          const match = voyageIntelRes.data.data.voyages.find((v) => String(v.voyageId) === id);
          if (match) setDelayRisk(match.delayRisk);
        }
        if (profitRes) setProfitability(profitRes.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load voyage.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-navy-500 dark:text-slate-400">Loading voyage…</p>;
  if (error) return <p className="text-sm text-status-critical">{error}</p>;
  if (!voyage) return null;

  const progressPct = voyage.distance > 0 ? Math.min(100, Math.round((voyage.distanceTravelled / voyage.distance) * 100)) : 0;
  const hasCoords = voyage.originLat != null && voyage.destinationLat != null;

  return (
    <div className="space-y-5">
      <Link to="/voyages" className="inline-flex items-center gap-1.5 text-sm text-navy-500 dark:text-slate-400 hover:text-sea-500">
        <ArrowLeft className="w-4 h-4" /> Back to voyages
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{voyage.origin} → {voyage.destination}</h1>
          <p className="text-sm text-navy-500 dark:text-slate-400">{voyage.vessel?.name} · {voyage.vessel?.imoNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={voyage.status} />
          {delayRisk && <RiskBadge score={delayRisk.probability} label={`${delayRisk.risk} delay risk`} />}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
          <p className="text-xs text-navy-500 dark:text-slate-400">Departure</p>
          <p className="font-medium">{new Date(voyage.departureDate).toLocaleDateString()}</p>
        </div>
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
          <p className="text-xs text-navy-500 dark:text-slate-400">ETA</p>
          <p className="font-medium">{new Date(voyage.expectedArrival).toLocaleDateString()}</p>
        </div>
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
          <p className="text-xs text-navy-500 dark:text-slate-400">Distance</p>
          <p className="font-medium">{voyage.distance.toLocaleString()} NM</p>
        </div>
      </div>

      <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-navy-500 dark:text-slate-400">Distance travelled: {voyage.distanceTravelled.toLocaleString()} NM</span>
          <span className="text-navy-500 dark:text-slate-400">Remaining: {(voyage.distance - voyage.distanceTravelled).toLocaleString()} NM</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
          <div className="h-full bg-sea-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-navy-500 dark:text-slate-400 mt-1.5">{progressPct}% complete</p>
      </div>

      {hasCoords && (
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-2 shadow-panel overflow-hidden">
          <div className="h-72 rounded-lg overflow-hidden">
            <MapContainer
              bounds={[[voyage.originLat, voyage.originLng], [voyage.destinationLat, voyage.destinationLng]]}
              boundsOptions={{ padding: [30, 30] }}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[voyage.originLat, voyage.originLng]}>
                <Popup>Origin: {voyage.origin}</Popup>
              </Marker>
              <Marker position={[voyage.destinationLat, voyage.destinationLng]}>
                <Popup>Destination: {voyage.destination}</Popup>
              </Marker>
              <Polyline
                positions={[[voyage.originLat, voyage.originLng], [voyage.destinationLat, voyage.destinationLng]]}
                pathOptions={{ color: '#1B7A8C', weight: 2, dashArray: '6 6' }}
              />
            </MapContainer>
          </div>
          <p className="text-xs text-navy-400 px-2 py-1.5">
            Route line shown between port coordinates — live vessel position along the route uses simulated GPS (see Tracking).
          </p>
        </div>
      )}

      {delayRisk && delayRisk.reasons.length > 0 && delayRisk.reasons[0] !== 'No significant delay signals detected' && (
        <div className="ff-card p-4 border-l-2 border-signal-500">
          <p className="text-xs font-medium text-navy-500 dark:text-slate-400 mb-1">Why this voyage has delay risk (operational estimate)</p>
          <ul className="list-disc list-inside text-sm text-navy-700 dark:text-slate-300 space-y-0.5">
            {delayRisk.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {profitability && (
        <div className="ff-card p-5">
          <SectionHeader icon={DollarSign} title="Voyage Profitability" subtitle="Estimate — see Profitability page for assumptions used" accent="sea" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FinCell label="Revenue" value={usd(profitability.revenue)} />
            <FinCell label="Total Cost" value={usd(profitability.totalCost)} />
            <FinCell label="Profit" value={usd(profitability.profit)} accent={profitability.profit >= 0 ? 'positive' : 'negative'} />
            <FinCell label="Margin" value={`${profitability.margin}%`} accent={profitability.margin >= 0 ? 'positive' : 'negative'} />
          </div>
          <Link to="/profitability" className="inline-block text-xs text-sea-500 hover:underline mt-3">
            View full financial intelligence & What-If Simulator →
          </Link>
        </div>
      )}

      {performance && (
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Voyage Performance</h2>
            <span className="text-lg font-display font-semibold">{performance.overall} / 100 · {performance.rating}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PerfBar label="Fuel Efficiency" value={performance.breakdown.fuelEfficiency} />
            <PerfBar label="Schedule" value={performance.breakdown.schedule} />
            <PerfBar label="Route Efficiency" value={performance.breakdown.routeEfficiency} />
            <PerfBar label="Cargo Delivery" value={performance.breakdown.cargoDelivery} />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl shadow-panel overflow-hidden">
        <h2 className="text-sm font-semibold px-5 pt-5 pb-3">Cargo on this voyage</h2>
        {cargo.length === 0 ? (
          <p className="text-sm text-navy-500 dark:text-slate-400 px-5 pb-5">No cargo linked to this voyage yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-navy-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-800">
                <th className="px-5 py-2 font-medium">Cargo ID</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Weight</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {cargo.map((c) => (
                <tr key={c._id} className="border-b border-slate-100 dark:border-navy-800 last:border-0">
                  <td className="px-5 py-2">{c.cargoId}</td>
                  <td className="px-5 py-2">{c.cargoType}</td>
                  <td className="px-5 py-2 text-navy-500 dark:text-slate-400">{c.weight.toLocaleString()} t</td>
                  <td className="px-5 py-2"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FinCell({ label, value, accent }) {
  const color = accent === 'positive' ? 'text-status-active' : accent === 'negative' ? 'text-status-critical' : 'text-navy-900 dark:text-slate-100';
  return (
    <div>
      <p className="text-xs text-navy-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-display font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function PerfBar({ label, value }) {
  return (
    <div>
      <p className="text-xs text-navy-500 dark:text-slate-400 mb-1">{label}</p>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden mb-1">
        <div className="h-full bg-sea-500 rounded-full" style={{ width: `${value}%` }} />
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
