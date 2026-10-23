import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = ['Engine', 'Propeller', 'Hull', 'Electrical', 'Navigation', 'Safety', 'Fuel System', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

const EMPTY = {
  vessel: '', title: '', description: '', category: 'Engine', priority: 'Medium',
  scheduledDate: '', assignedTechnician: '', cost: '', status: 'Scheduled', notes: '',
};

function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export default function MaintenanceFormModal({ open, initialData, vessels, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({ ...EMPTY, ...initialData, vessel: initialData.vessel?._id || initialData.vessel, scheduledDate: toDateInput(initialData.scheduledDate) });
    } else {
      setForm(EMPTY);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="maintenance-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-navy-900 rounded-xl shadow-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="maintenance-modal-title" className="text-base font-semibold">{initialData ? 'Edit Maintenance Task' : 'New Maintenance Task'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800" aria-label="Close">
            <X className="w-4.5 h-4.5" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">Vessel</span>
            <select name="vessel" value={form.vessel} onChange={handleChange} required
              className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm">
              <option value="">Select a vessel…</option>
              {vessels.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </label>

          <Field label="Title" name="title" value={form.title} onChange={handleChange} required />

          <label className="block">
            <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">Description</span>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2}
              className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Category" name="category" value={form.category} onChange={handleChange} options={CATEGORIES} />
            <SelectField label="Priority" name="priority" value={form.priority} onChange={handleChange} options={PRIORITIES} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Scheduled date" name="scheduledDate" type="date" value={form.scheduledDate} onChange={handleChange} required />
            <SelectField label="Status" name="status" value={form.status} onChange={handleChange} options={STATUSES} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Assigned technician" name="assignedTechnician" value={form.assignedTechnician} onChange={handleChange} />
            <Field label="Cost ($)" name="cost" type="number" value={form.cost} onChange={handleChange} />
          </div>

          {error && (
            <p role="alert" className="text-sm text-status-critical bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-3 py-1.5 rounded-lg text-sm bg-navy-900 dark:bg-sea-500 text-white hover:opacity-90 disabled:opacity-60">
              {submitting ? 'Saving…' : initialData ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">{label}</span>
      <input {...props} className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm" />
    </label>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">{label}</span>
      <select {...props} className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
