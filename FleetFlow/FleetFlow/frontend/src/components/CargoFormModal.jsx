import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CARGO_TYPES = ['Electronics', 'Textiles', 'Machinery', 'Grain', 'Crude Oil', 'Automobiles', 'Furniture', 'Chemicals', 'Other'];
const STATUSES = ['Booked', 'Loading', 'Loaded', 'In Transit', 'Arrived', 'Delivered', 'Delayed'];

const EMPTY = {
  cargoId: '', voyage: '', cargoType: 'Electronics', weight: '', containerCount: '',
  origin: '', destination: '', loadingDate: '', expectedDelivery: '', status: 'Booked',
};

function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export default function CargoFormModal({ open, initialData, voyages, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        ...EMPTY,
        ...initialData,
        voyage: initialData.voyage?._id || initialData.voyage,
        loadingDate: toDateInput(initialData.loadingDate),
        expectedDelivery: toDateInput(initialData.expectedDelivery),
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

  function handleVoyageChange(e) {
    const voyageId = e.target.value;
    const selected = voyages.find((v) => v._id === voyageId);
    setForm((f) => ({
      ...f,
      voyage: voyageId,
      origin: selected?.origin || f.origin,
      destination: selected?.destination || f.destination,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cargo-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-navy-900 rounded-xl shadow-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="cargo-modal-title" className="text-base font-semibold">{initialData ? 'Edit Cargo' : 'New Cargo'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800" aria-label="Close">
            <X className="w-4.5 h-4.5" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo ID" name="cargoId" value={form.cargoId} onChange={handleChange} required disabled={!!initialData} />
            <SelectField label="Cargo type" name="cargoType" value={form.cargoType} onChange={handleChange} options={CARGO_TYPES} />
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">Voyage</span>
            <select name="voyage" value={form.voyage} onChange={handleVoyageChange} required
              className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm">
              <option value="">Select a voyage…</option>
              {voyages.map((v) => (
                <option key={v._id} value={v._id}>{v.vessel?.name}: {v.origin} → {v.destination}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin" name="origin" value={form.origin} onChange={handleChange} required />
            <Field label="Destination" name="destination" value={form.destination} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (t)" name="weight" type="number" value={form.weight} onChange={handleChange} required />
            <Field label="Container count" name="containerCount" type="number" value={form.containerCount} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Loading date" name="loadingDate" type="date" value={form.loadingDate} onChange={handleChange} />
            <Field label="Expected delivery" name="expectedDelivery" type="date" value={form.expectedDelivery} onChange={handleChange} required />
          </div>

          <SelectField label="Status" name="status" value={form.status} onChange={handleChange} options={STATUSES} />

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
              {submitting ? 'Saving…' : initialData ? 'Save changes' : 'Create cargo'}
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
      <input {...props} className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm disabled:opacity-60" />
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
