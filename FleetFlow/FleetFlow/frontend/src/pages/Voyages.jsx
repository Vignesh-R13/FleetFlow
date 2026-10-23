import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Navigation, Compass, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import VoyageFormModal from '../components/VoyageFormModal';

const STATUS_FILTERS = ['', 'In Transit', 'Delayed', 'Scheduled', 'Completed', 'Arrived'];

export default function Voyages() {
  const { user } = useAuth();
  const canWrite = ['ADMIN', 'FLEET_MANAGER'].includes(user?.role);
  const canEdit = canWrite || user?.role === 'CAPTAIN';

  const [voyages, setVoyages] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    api.get('/vessels', { params: { limit: 100 } }).then((res) => setVessels(res.data.data)).catch(() => {});
  }, []);

  const [delayRiskByVoyage, setDelayRiskByVoyage] = useState({});

  useEffect(() => {
    api.get('/intelligence/voyages')
      .then((res) => {
        const map = Object.fromEntries(res.data.data.voyages.map((v) => [String(v.voyageId), v.delayRisk]));
        setDelayRiskByVoyage(map);
      })
      .catch(() => {});
  }, []);

  const fetchVoyages = useCallback(
    async (page = 1) => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await api.get('/voyages', { params: { search, status, page, limit: 8 } });
        setVoyages(res.data.data);
        setPagination(res.data.pagination);
      } catch (err) {
        setLoadError(err.response?.data?.message || 'Unable to load voyages. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [search, status]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchVoyages(1), 300);
    return () => clearTimeout(t);
  }, [fetchVoyages]);

  async function handleFormSubmit(form) {
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...form, distance: Number(form.distance), fuelBudget: form.fuelBudget ? Number(form.fuelBudget) : 0 };
      if (editing) {
        await api.put(`/voyages/${editing._id}`, payload);
      } else {
        await api.post('/voyages', payload);
      }
      setModalOpen(false);
      setEditing(null);
      fetchVoyages(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save voyage.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/voyages/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchVoyages(pagination.page);
    } catch (err) {
      setDeleteTarget(null);
      setLoadError(err.response?.data?.message || 'Unable to delete voyage.');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400">
              <Navigation className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              Voyages
            </h1>
          </div>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            {pagination.total} voyages active and scheduled across trade corridors
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => { setEditing(null); setFormError(''); setModalOpen(true); }}
            className="ff-btn-primary self-start sm:self-auto text-xs"
          >
            <Plus className="w-4 h-4" /> Create voyage
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search origin or destination..."
            className="ff-input pl-10"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                status === s
                  ? 'bg-navy-900 dark:bg-sea-500 text-white shadow-sm border border-transparent'
                  : 'bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-700 text-navy-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="ff-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-navy-500 dark:text-slate-400 animate-pulse">Loading voyage records…</div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-status-critical mb-2">{loadError}</p>
            <button onClick={() => fetchVoyages(1)} className="text-xs font-bold text-sea-500 hover:underline">Try again</button>
          </div>
        ) : voyages.length === 0 ? (
          <div className="p-12 text-center">
            <Navigation className="w-10 h-10 mx-auto text-navy-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-navy-900 dark:text-slate-100">No voyages found.</p>
            <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">There are no voyages matching your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800">
                  <th className="ff-th">Route</th>
                  <th className="ff-th">Vessel</th>
                  <th className="ff-th">Departure</th>
                  <th className="ff-th">ETA</th>
                  <th className="ff-th">Distance</th>
                  <th className="ff-th">Status</th>
                  <th className="ff-th">Delay Risk</th>
                  <th className="ff-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800/60">
                {voyages.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/80 dark:hover:bg-navy-800/50 transition-colors group">
                    <td className="ff-td">
                      <Link to={`/voyages/${v._id}`} className="font-bold text-navy-900 dark:text-slate-100 group-hover:text-sea-500 dark:group-hover:text-teal-400 transition-colors flex items-center gap-1.5">
                        <span>{v.origin} → {v.destination}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="ff-td font-medium text-navy-700 dark:text-slate-300">{v.vessel?.name || '—'}</td>
                    <td className="ff-td text-navy-500 dark:text-slate-400 font-mono text-xs">{new Date(v.departureDate).toLocaleDateString()}</td>
                    <td className="ff-td text-navy-500 dark:text-slate-400 font-mono text-xs">{new Date(v.expectedArrival).toLocaleDateString()}</td>
                    <td className="ff-td text-navy-700 dark:text-slate-300 font-mono text-xs">{v.distance?.toLocaleString()} NM</td>
                    <td className="ff-td"><StatusBadge status={v.status} /></td>
                    <td className="ff-td">
                      {delayRiskByVoyage[v._id]
                        ? <RiskBadge score={delayRiskByVoyage[v._id].probability} label={delayRiskByVoyage[v._id].risk} />
                        : <span className="text-xs text-navy-300 dark:text-navy-700">—</span>}
                    </td>
                    <td className="ff-td text-right">
                      <div className="flex justify-end items-center gap-1">
                        {canEdit && (
                          <button onClick={() => { setEditing(v); setFormError(''); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-navy-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                            aria-label="Edit voyage"
                            title="Edit voyage"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canWrite && (
                          <button onClick={() => setDeleteTarget(v)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            aria-label="Delete voyage"
                            title="Delete voyage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-navy-800 text-xs">
            <span className="text-navy-500 dark:text-slate-400">
              Page <strong className="text-navy-900 dark:text-slate-200">{pagination.page}</strong> of <strong className="text-navy-900 dark:text-slate-200">{pagination.pages}</strong>
            </span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchVoyages(pagination.page - 1)}
                className="ff-btn-secondary py-1 px-3 text-xs">Previous</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchVoyages(pagination.page + 1)}
                className="ff-btn-secondary py-1 px-3 text-xs">Next</button>
            </div>
          </div>
        )}
      </div>

      <VoyageFormModal
        open={modalOpen}
        initialData={editing}
        vessels={vessels}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this voyage?"
        message="This action cannot be undone. Cargo records linked to this voyage will remain but lose their voyage reference."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
