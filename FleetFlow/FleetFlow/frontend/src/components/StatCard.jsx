export default function StatCard({ label, value, icon: Icon, accent = 'sea', loading = false, trend }) {
  const accentClasses = {
    sea:      'text-teal-400 bg-teal-500/15 border border-teal-500/30',
    signal:   'text-amber-400 bg-amber-500/15 border border-amber-500/30',
    critical: 'text-red-400 bg-red-500/15 border border-red-500/30',
    active:   'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30',
    warning:  'text-amber-400 bg-amber-500/15 border border-amber-500/30',
  };

  if (loading) {
    return (
      <div className="ff-card p-4.5">
        <div className="flex items-start justify-between">
          <div className="space-y-2.5 flex-1">
            <div className="ff-skeleton h-3.5 w-24 rounded" />
            <div className="ff-skeleton h-7 w-16 rounded" />
          </div>
          <div className="ff-skeleton w-9 h-9 rounded-xl ml-3 shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="ff-card-interactive p-4.5 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-navy-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-2xl lg:text-3xl font-bold mt-1.5 font-display text-navy-900 dark:text-white tabular-nums tracking-tight">
            {value ?? '—'}
          </p>
          {trend && (
            <p className={`text-xs mt-1 font-semibold flex items-center gap-1 ${trend.positive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.text}</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ml-2 shadow-sm transition-transform duration-200 group-hover:scale-105 ${accentClasses[accent] || accentClasses.sea}`}>
            <Icon className="w-5 h-5" size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
