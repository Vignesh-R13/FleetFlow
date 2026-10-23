import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const VESSEL_TYPES = ['Container Ship', 'Bulk Carrier', 'Tanker', 'Cargo Ship', 'Ro-Ro', 'General Cargo', 'Other'];
const VESSEL_STATUSES = ['Active', 'Idle', 'Maintenance', 'Offline'];

const EMPTY = {
  name: '', imoNumber: '', type: 'Container Ship', flag: '', yearBuilt: '',
  capacity: '', fuelCapacity: '', engineType: '', status: 'Idle',
};

export default function VesselFormModal({ open, initialData, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="vessel-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-navy-900 rounded-xl shadow-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="vessel-modal-title" className="text-base font-semibold">{initialData ? 'Edit Vessel' : 'Add Vessel'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800" aria-label="Close">
            <X className="w-4.5 h-4.5" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vessel name" name="name" value={form.name} onChange={handleChange} required />
            <Field label="IMO number" name="imoNumber" value={form.imoNumber} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Type" name="type" value={form.type} onChange={handleChange} options={VESSEL_TYPES} />
            <SelectField label="Status" name="status" value={form.status} onChange={handleChange} options={VESSEL_STATUSES} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Flag" name="flag" value={form.flag} onChange={handleChange} required />
            <Field label="Year built" name="yearBuilt" type="number" value={form.yearBuilt} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
            <Field label="Fuel capacity (t)" name="fuelCapacity" type="number" value={form.fuelCapacity} onChange={handleChange} />
          </div>

          <Field label="Engine type" name="engineType" value={form.engineType} onChange={handleChange} />

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
              {submitting ? 'Saving…' : initialData ? 'Save changes' : 'Create vessel'}
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
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500"
      />
    </label>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-navy-600 dark:text-slate-400 mb-1">{label}</span>
      <select
        {...props}
        className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
