import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Package, Boxes, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import CargoFormModal from '../components/CargoFormModal';

const STATUSES = ['Booked', 'Loading', 'Loaded', 'In Transit', 'Arrived', 'Delivered', 'Delayed'];

export default function Cargo() {
  const { user } = useAuth();
  const canWrite = ['ADMIN', 'FLEET_MANAGER'].includes(user?.role);

  const [items, setItems] = useState([]);
  const [voyages, setVoyages] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    api.get('/voyages', { params: { limit: 100 } }).then((res) => setVoyages(res.data.data)).catch(() => {});
  }, []);

  const [delayRiskByVoyage, setDelayRiskByVoyage] = useState({});
  useEffect(() => {
    api.get('/intelligence/voyages')
      .then((res) => {
        const map = Object.fromEntries(res.data.data.voyages.map((v) => [String(v.voyageId), v.delayRisk]));
        setDelayRiskByVoyage(map);
      })
      .catch(() => setDelayRiskByVoyage({}));
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/cargo', { params: { status, limit: 50 } });
      setItems(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load cargo.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleFormSubmit(form) {
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...form, weight: Number(form.weight), containerCount: form.containerCount ? Number(form.containerCount) : 0 };
      if (editing) await api.put(`/cargo/${editing._id}`, payload);
      else await api.post('/cargo', payload);
      setModalOpen(false);
      setEditing(null);
      fetchItems();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save cargo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/cargo/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      setDeleteTarget(null);
      setError(err.response?.data?.message || 'Unable to delete cargo.');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400">
              <Boxes className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              Cargo Management
            </h1>
          </div>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            {items.length} active consignments and container shipments
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => { setEditing(null); setFormError(''); setModalOpen(true); }}
            className="ff-btn-primary self-start sm:self-auto text-xs"
          >
            <Plus className="w-4 h-4" /> New cargo
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1 scrollbar-thin">
        {['', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              status === s
                ? 'bg-navy-900 dark:bg-sea-500 text-white shadow-sm border border-transparent'
                : 'bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-700 text-navy-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800'
            }`}
          >
            {s || 'All Shipments'}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="ff-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-navy-500 dark:text-slate-400 animate-pulse">Loading cargo manifests…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-status-critical mb-2">{error}</p>
            <button onClick={fetchItems} className="text-xs font-bold text-sea-500 hover:underline">Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 mx-auto text-navy-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-navy-900 dark:text-slate-100">No cargo records found.</p>
            <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">There are no manifests matching your filter.</p>
            {canWrite && (
              <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-sea-500 dark:text-teal-400 hover:underline mt-2">
                Add your first cargo record
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800">
                  <th className="ff-th">Cargo ID</th>
                  <th className="ff-th">Type</th>
                  <th className="ff-th">Route</th>
                  <th className="ff-th">Weight</th>
                  <th className="ff-th">Containers</th>
                  <th className="ff-th">Status</th>
                  <th className="ff-th">Delivery Risk</th>
                  <th className="ff-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800/60">
                {items.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-navy-800/50 transition-colors group">
                    <td className="ff-td font-bold font-mono text-navy-900 dark:text-slate-100">{c.cargoId}</td>
                    <td className="ff-td font-medium text-navy-700 dark:text-slate-300">{c.cargoType}</td>
                    <td className="ff-td text-navy-600 dark:text-slate-400 font-medium">{c.origin} → {c.destination}</td>
                    <td className="ff-td text-navy-700 dark:text-slate-300 font-mono text-xs">{c.weight.toLocaleString()} t</td>
                    <td className="ff-td text-navy-700 dark:text-slate-300 font-mono text-xs">{c.containerCount || '—'}</td>
                    <td className="ff-td"><StatusBadge status={c.status} /></td>
                    <td className="ff-td">
                      {c.status === 'Delivered' ? (
                        <span className="text-xs text-navy-300 dark:text-navy-700">—</span>
                      ) : delayRiskByVoyage[c.voyage?._id] ? (
                        <RiskBadge score={delayRiskByVoyage[c.voyage._id].probability} label={delayRiskByVoyage[c.voyage._id].risk} />
                      ) : (
                        <span className="text-xs text-navy-300 dark:text-navy-700">—</span>
                      )}
                    </td>
                    <td className="ff-td text-right">
                      <div className="flex justify-end items-center gap-1">
                        {canWrite && (
                          <>
                            <button
                              onClick={() => { setEditing(c); setFormError(''); setModalOpen(true); }}
                              className="p-1.5 rounded-lg text-navy-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                              aria-label={`Edit ${c.cargoId}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              aria-label={`Delete ${c.cargoId}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CargoFormModal
        open={modalOpen} initialData={editing} voyages={voyages}
        onClose={() => setModalOpen(false)} onSubmit={handleFormSubmit} submitting={submitting} error={formError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete cargo ${deleteTarget?.cargoId}?`}
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
