import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Ship, Anchor, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import HealthScore from '../components/HealthScore';
import ConfirmDialog from '../components/ConfirmDialog';
import VesselFormModal from '../components/VesselFormModal';

const STATUSES = ['Active', 'Idle', 'Maintenance', 'Offline'];

export default function Fleet() {
  const { user } = useAuth();
  const canWrite = ['ADMIN', 'FLEET_MANAGER'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

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

  const [healthByVessel, setHealthByVessel] = useState({});

  useEffect(() => {
    api.get('/intelligence/fleet-health')
      .then((res) => {
        const map = Object.fromEntries(res.data.data.vessels.map((v) => [String(v.vesselId), v.overall]));
        setHealthByVessel(map);
      })
      .catch(() => setHealthByVessel({}));
  }, []);

  const fetchVessels = useCallback(
    async (page = 1) => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await api.get('/vessels', { params: { search, status, page, limit: 8 } });
        setVessels(res.data.data);
        setPagination(res.data.pagination);
      } catch (err) {
        setLoadError(err.response?.data?.message || 'Unable to load vessels. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [search, status]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchVessels(1), 300);
    return () => clearTimeout(t);
  }, [fetchVessels]);

  async function handleFormSubmit(form) {
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        fuelCapacity: form.fuelCapacity ? Number(form.fuelCapacity) : undefined,
      };
      if (editing) {
        await api.put(`/vessels/${editing._id}`, payload);
      } else {
        await api.post('/vessels', payload);
      }
      setModalOpen(false);
      setEditing(null);
      fetchVessels(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save vessel.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/vessels/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchVessels(pagination.page);
    } catch (err) {
      setDeleteTarget(null);
      setLoadError(err.response?.data?.message || 'Unable to delete vessel.');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400">
              <Ship className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              Fleet
            </h1>
          </div>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            {pagination.total} vessels registered under management
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setEditing(null);
              setFormError('');
              setModalOpen(true);
            }}
            className="ff-btn-primary self-start sm:self-auto text-xs"
          >
            <Plus className="w-4 h-4" /> Add vessel
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
            placeholder="Search vessel name or IMO number..."
            className="ff-input pl-10"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="ff-input sm:w-48 cursor-pointer font-medium"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table Card */}
      <div className="ff-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-navy-500 dark:text-slate-400 animate-pulse">Loading fleet data…</div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-status-critical mb-2">{loadError}</p>
            <button onClick={() => fetchVessels(1)} className="text-xs font-bold text-sea-500 hover:underline">Try again</button>
          </div>
        ) : vessels.length === 0 ? (
          <div className="p-12 text-center">
            <Ship className="w-10 h-10 mx-auto text-navy-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-navy-900 dark:text-slate-100">No vessels found.</p>
            <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">There are no vessels matching your search or status criteria.</p>
            {canWrite && (
              <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-sea-500 dark:text-teal-400 hover:underline mt-2">
                Add your first vessel
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800">
                  <th className="ff-th">Vessel</th>
                  <th className="ff-th">IMO</th>
                  <th className="ff-th">Type</th>
                  <th className="ff-th">Flag</th>
                  <th className="ff-th">Status</th>
                  <th className="ff-th">Health</th>
                  <th className="ff-th">Speed</th>
                  <th className="ff-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800/60">
                {vessels.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/80 dark:hover:bg-navy-800/50 transition-colors group">
                    <td className="ff-td">
                      <Link to={`/fleet/${v._id}`} className="font-bold text-navy-900 dark:text-slate-100 group-hover:text-sea-500 dark:group-hover:text-teal-400 transition-colors flex items-center gap-1.5">
                        <span>{v.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="ff-td text-navy-500 dark:text-slate-400 font-mono text-xs">{v.imoNumber}</td>
                    <td className="ff-td font-medium text-navy-700 dark:text-slate-300">{v.type}</td>
                    <td className="ff-td text-navy-600 dark:text-slate-400">{v.flag || '—'}</td>
                    <td className="ff-td"><StatusBadge status={v.status} /></td>
                    <td className="ff-td">
                      {healthByVessel[v._id] != null
                        ? <HealthScore score={healthByVessel[v._id]} showLabel={false} />
                        : <span className="text-xs text-navy-300 dark:text-navy-700">—</span>}
                    </td>
                    <td className="ff-td text-navy-700 dark:text-slate-300 font-mono">
                      {v.currentSpeed?.toFixed?.(1) ?? 0} <span className="text-xs text-navy-400">kn</span>
                    </td>
                    <td className="ff-td text-right">
                      <div className="flex justify-end items-center gap-1">
                        {canWrite && (
                          <button
                            onClick={() => { setEditing(v); setFormError(''); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-navy-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                            aria-label={`Edit ${v.name}`}
                            title={`Edit ${v.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(v)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            aria-label={`Delete ${v.name}`}
                            title={`Delete ${v.name}`}
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
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchVessels(pagination.page - 1)}
                className="ff-btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchVessels(pagination.page + 1)}
                className="ff-btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <VesselFormModal
        open={modalOpen}
        initialData={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}?`}
        message="This action cannot be undone. All associated voyage, fuel, and maintenance history will remain linked to a removed vessel."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
