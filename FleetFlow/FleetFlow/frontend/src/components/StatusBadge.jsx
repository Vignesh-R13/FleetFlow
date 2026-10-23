const CONFIG = {
  // Vessel statuses
  Active:       { dot: 'bg-emerald-400 animate-pulse-subtle', classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' },
  Idle:         { dot: 'bg-slate-400',                        classes: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30' },
  Maintenance:  { dot: 'bg-amber-400',                        classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30' },
  Offline:      { dot: 'bg-zinc-500',                         classes: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border border-zinc-500/30' },
  // Voyage statuses
  Scheduled:    { dot: 'bg-sky-400',                          classes: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30' },
  Loading:      { dot: 'bg-sky-400',                          classes: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30' },
  Loaded:       { dot: 'bg-sky-400',                          classes: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30' },
  Departed:     { dot: 'bg-teal-400',                         classes: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30' },
  'In Transit': { dot: 'bg-teal-400 animate-pulse-subtle',    classes: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30' },
  Delayed:      { dot: 'bg-red-500 animate-pulse',            classes: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30' },
  Arrived:      { dot: 'bg-emerald-400',                      classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' },
  Completed:    { dot: 'bg-emerald-400',                      classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' },
  Delivered:    { dot: 'bg-emerald-400',                      classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' },
  Cancelled:    { dot: 'bg-slate-400',                        classes: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30' },
  // Maintenance statuses
  Assigned:     { dot: 'bg-sky-400',                          classes: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30' },
  'In Progress':{ dot: 'bg-amber-400',                        classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30' },
  Overdue:      { dot: 'bg-red-500 animate-pulse',            classes: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30' },
  // Cargo statuses
  Booked:       { dot: 'bg-sky-400',                          classes: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30' },
};

const FALLBACK = { dot: 'bg-navy-500', classes: 'bg-navy-500/10 text-navy-700 dark:text-slate-300 border border-navy-500/20' };

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${cfg.classes}`}
      aria-label={`Status: ${status}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}
