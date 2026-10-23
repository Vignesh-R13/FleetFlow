import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STATUSES = ['Scheduled', 'Loading', 'Departed', 'In Transit', 'Delayed', 'Arrived', 'Completed', 'Cancelled'];

const EMPTY = {
  vessel: '', origin: '', destination: '', departureDate: '', expectedArrival: '',
  distance: '', fuelBudget: '', status: 'Scheduled', notes: '',
};

function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export default function VoyageFormModal({ open, initialData, vessels, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        ...EMPTY,
        ...initialData,
        vessel: initialData.vessel?._id || initialData.vessel,
        departureDate: toDateInput(initialData.departureDate),
        expectedArrival: toDateInput(initialData.expectedArrival),
      });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="voyage-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-navy-900 rounded-xl shadow-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="voyage-modal-title" className="text-base font-semibold">{initialData ? 'Edit Voyage' : 'Create Voyage'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800" aria-label="Close">
            <X className="w-4.5 h-4.5" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">Vessel</span>
            <select name="vessel" value={form.vessel} onChange={handleChange} required
              className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500">
              <option value="">Select a vessel…</option>
              {vessels.map((v) => (
                <option key={v._id} value={v._id}>{v.name} ({v.imoNumber})</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin" name="origin" value={form.origin} onChange={handleChange} required />
            <Field label="Destination" name="destination" value={form.destination} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Departure date" name="departureDate" type="date" value={form.departureDate} onChange={handleChange} required />
            <Field label="Expected arrival" name="expectedArrival" type="date" value={form.expectedArrival} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Distance (NM)" name="distance" type="number" value={form.distance} onChange={handleChange} required />
            <Field label="Fuel budget (t)" name="fuelBudget" type="number" value={form.fuelBudget} onChange={handleChange} />
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">Status</span>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">Notes</span>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500" />
          </label>

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
              {submitting ? 'Saving…' : initialData ? 'Save changes' : 'Create voyage'}
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
      <input {...props} className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500" />
    </label>
  );
}
