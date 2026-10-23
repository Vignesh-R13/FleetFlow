import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import api from '../services/api';

const REPORTS = [
  { key: 'fleet', label: 'Fleet Report', description: 'Fleet summary, vessel status, and utilization.' },
  { key: 'voyages', label: 'Voyage Report', description: 'Voyage routes, schedule, and fuel budgets.' },
  { key: 'maintenance', label: 'Maintenance Report', description: 'Maintenance history, costs, and overdue tasks.' },
  { key: 'fuel', label: 'Fuel Report', description: 'Consumption history and expected vs actual.' },
  { key: 'profitability', label: 'Profitability Report', description: 'Per-voyage revenue, cost breakdown, profit, and margin (estimates).' },
];

export default function Reports() {
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');

  async function handleDownload(key, format) {
    const id = `${key}-${format}`;
    setDownloading(id);
    setError('');
    try {
      const res = await api.get(`/reports/${key}`, { params: { format }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${key}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Unable to generate report. Try again.');
    } finally {
      setDownloading('');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-navy-500 dark:text-slate-400">Export operational data as CSV or PDF.</p>
      </div>

      {error && <p className="text-sm text-status-critical">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <div key={r.key} className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-5 shadow-panel flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sea-500/10 text-sea-500 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">{r.label}</h2>
              <p className="text-xs text-navy-500 dark:text-slate-400 mt-0.5 mb-3">{r.description}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(r.key, 'csv')}
                  disabled={downloading === `${r.key}-csv`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sea-500 hover:underline disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloading === `${r.key}-csv` ? 'Generating…' : 'CSV'}
                </button>
                <button
                  onClick={() => handleDownload(r.key, 'pdf')}
                  disabled={downloading === `${r.key}-pdf`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sea-500 hover:underline disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloading === `${r.key}-pdf` ? 'Generating…' : 'PDF'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
