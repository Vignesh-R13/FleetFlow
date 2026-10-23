// Consistent page/section header: icon in a tinted circle + title + optional
// subtitle and right-aligned action slot (used for Command Center panels and
// can replace ad-hoc headers on other pages over time).
export default function SectionHeader({ icon: Icon, title, subtitle, action, accent = 'sea' }) {
  const accentClasses = {
    sea: 'text-sea-500 bg-sea-500/10',
    signal: 'text-signal-600 bg-signal-500/10',
    critical: 'text-status-critical bg-status-critical/10',
  };

  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`p-2 rounded-lg shrink-0 ${accentClasses[accent] || accentClasses.sea}`}>
            <Icon className="w-4.5 h-4.5" size={18} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-navy-900 dark:text-slate-100 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-navy-500 dark:text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
