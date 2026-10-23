import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Wrench, ShieldAlert, ChevronDown, ChevronUp, AlertCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import MaintenanceFormModal from '../components/MaintenanceFormModal';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';

const STATUS_FILTERS = ['', 'Scheduled', 'Assigned', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

export default function Maintenance() {
  const { user } = useAuth();
  const canWrite = ['ADMIN', 'MAINTENANCE_MANAGER', 'FLEET_MANAGER'].includes(user?.role);
  const canDelete = ['ADMIN', 'MAINTENANCE_MANAGER'].includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [riskList, setRiskList] = useState([]);
  const [riskLoading, setRiskLoading] = useState(true);
  const [expandedVessel, setExpandedVessel] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    api.get('/vessels', { params: { limit: 100 } }).then((res) => setVessels(res.data.data));
  }, []);

  useEffect(() => {
    setRiskLoading(true);
    api.get('/intelligence/maintenance')
      .then((res) => setRiskList(res.data.data))
      .catch(() => setRiskList([]))
      .finally(() => setRiskLoading(false));
  }, []);

  const riskByVessel = Object.fromEntries(riskList.map((r) => [String(r.vesselId), r]));

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/maintenance', { params: { status: statusFilter, limit: 50 } });
      setTasks(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load maintenance tasks.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const counts = {
    upcoming: tasks.filter((t) => t.status === 'Scheduled' || t.status === 'Assigned').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    overdue: tasks.filter((t) => t.status === 'Overdue').length,
  };

  async function handleFormSubmit(form) {
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...form, cost: form.cost ? Number(form.cost) : 0 };
      if (editing) await api.put(`/maintenance/${editing._id}`, payload);
      else await api.post('/maintenance', payload);
      setModalOpen(false);
      setEditing(null);
      fetchTasks();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save task.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/maintenance/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchTasks();
    } catch (err) {
      setDeleteTarget(null);
      setError(err.response?.data?.message || 'Unable to delete task.');
    }
  }

  const elevatedRisk = riskList.filter((r) => r.level === 'HIGH' || r.level === 'CRITICAL');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4.5 rounded-xl shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-900 dark:text-white tracking-tight">
              Maintenance Management
            </h1>
          </div>
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            Predictive maintenance scoring, drydock schedules, and service orders
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => { setEditing(null); setFormError(''); setModalOpen(true); }}
            className="ff-btn-primary self-start sm:self-auto text-xs"
          >
            <Plus className="w-4 h-4" /> New task
          </button>
        )}
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Counter label="Upcoming" value={counts.upcoming} />
        <Counter label="In Progress" value={counts.inProgress} />
        <Counter label="Completed" value={counts.completed} />
        <Counter label="Overdue" value={counts.overdue} accent="critical" />
      </div>

      {/* Predictive Maintenance Risk Panel */}
      <div className="ff-card p-5">
        <SectionHeader
          icon={ShieldAlert}
          title="Predictive Maintenance Risk"
          subtitle="Estimated, rules-based — click a vessel to see contributing factors"
          accent="signal"
        />
        {riskLoading ? (
          <div className="space-y-2 mt-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="ff-skeleton h-12 rounded-lg" />)}</div>
        ) : elevatedRisk.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No vessels at elevated maintenance risk" description="Nothing scoring HIGH or CRITICAL right now." />
        ) : (
          <div className="space-y-2 mt-3">
            {elevatedRisk.map((r) => {
              const isOpen = expandedVessel === r.vesselId;
              return (
                <div key={r.vesselId} className="rounded-xl border border-slate-200/80 dark:border-navy-800 bg-slate-50/50 dark:bg-navy-950/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedVessel(isOpen ? null : r.vesselId)}
                    className="w-full flex items-center justify-between gap-3 p-3.5 hover:bg-slate-100/60 dark:hover:bg-navy-900/60 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-navy-900 dark:text-slate-100">{r.vesselName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <RiskBadge score={r.score} label={r.level} />
                      {isOpen ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs border-t border-slate-200/60 dark:border-navy-800/80 bg-white dark:bg-navy-900/80">
                      <p className="font-bold text-navy-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Contributing Diagnostic Factors:</p>
                      <ul className="list-disc list-inside text-navy-700 dark:text-slate-300 space-y-1">
                        {r.factors.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                      <div className="mt-3 p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <p className="font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider text-[10px]">Recommended Action</p>
                        <p className="text-navy-800 dark:text-slate-200 mt-0.5">{r.recommendedAction}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === s
                ? 'bg-navy-900 dark:bg-sea-500 text-white shadow-sm border border-transparent'
                : 'bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-700 text-navy-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800'
            }`}
          >
            {s || 'All Statuses'}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="ff-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-navy-500 dark:text-slate-400 animate-pulse">Loading maintenance tasks…</div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-sm text-status-critical">{error}</p></div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-10 h-10 mx-auto text-navy-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-navy-900 dark:text-slate-100">No maintenance tasks found.</p>
            <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">There are no maintenance tasks in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800">
                  <th className="ff-th">Task Title</th>
                  <th className="ff-th">Vessel</th>
                  <th className="ff-th">Priority</th>
                  <th className="ff-th">Scheduled Date</th>
                  <th className="ff-th">Status</th>
                  <th className="ff-th">Vessel Risk</th>
                  <th className="ff-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800/60">
                {tasks.map((t) => {
                  const risk = t.vessel?._id ? riskByVessel[String(t.vessel._id)] : null;
                  return (
                    <tr key={t._id} className="hover:bg-slate-50/80 dark:hover:bg-navy-800/50 transition-colors group">
                      <td className="ff-td font-bold text-navy-900 dark:text-slate-100">{t.title}</td>
                      <td className="ff-td font-medium text-navy-700 dark:text-slate-300">{t.vessel?.name || '—'}</td>
                      <td className="ff-td">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          t.priority === 'High' || t.priority === 'Urgent'
                            ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                            : t.priority === 'Medium'
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="ff-td text-navy-500 dark:text-slate-400 font-mono text-xs">{new Date(t.scheduledDate).toLocaleDateString()}</td>
                      <td className="ff-td"><StatusBadge status={t.status} /></td>
                      <td className="ff-td">
                        {risk ? <RiskBadge score={risk.score} label={risk.level} /> : <span className="text-xs text-navy-300 dark:text-navy-700">—</span>}
                      </td>
                      <td className="ff-td text-right">
                        <div className="flex justify-end items-center gap-1">
                          {canWrite && (
                            <button
                              onClick={() => { setEditing(t); setFormError(''); setModalOpen(true); }}
                              className="p-1.5 rounded-lg text-navy-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                              aria-label="Edit task"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(t)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              aria-label="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MaintenanceFormModal
        open={modalOpen} initialData={editing} vessels={vessels}
        onClose={() => setModalOpen(false)} onSubmit={handleFormSubmit} submitting={submitting} error={formError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this task?"
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function Counter({ label, value, accent }) {
  return (
    <div className="ff-card p-4 group hover:border-sea-500/30 transition-all">
      <p className="text-xs font-semibold text-navy-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl lg:text-3xl font-bold font-display mt-1 tabular-nums ${accent === 'critical' ? 'text-status-critical' : 'text-navy-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}
